import type { IncomingMessage, ServerResponse } from "node:http";
import type { Address, Hex } from "viem";
import { authenticateIdentityAccessKey } from "../agent/auth.js";
import { beginPerplEnrollment } from "./secure-enrollment.js";
import { consumePendingEnrollment, getPendingEnrollment, savePendingEnrollment, savePerplSecret } from "./enrollment-store.js";
import { enrollApiKey } from "./enrollment.js";
import { rateLimit, clientIp } from "../security/rate-limit.js";

function json(res: ServerResponse, status: number, body: unknown) { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); }
function bearer(req: IncomingMessage) { const value = req.headers.authorization; return typeof value === "string" && value.startsWith("Bearer ") ? value.slice(7).trim() : ""; }
async function body(req: IncomingMessage) { const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); if (Buffer.concat(chunks).length > 16_384) throw new Error("Request body too large"); return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>; }

export async function handlePerplRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (!req.url || !req.method || !req.url.startsWith("/api/perpl/enroll/")) return false;
  const limit = rateLimit(`perpl-enroll:${clientIp(req.headers)}`, 8, 60_000);
  if (!limit.allowed) { res.setHeader("retry-after", String(Math.ceil(limit.retryAfterMs / 1000))); json(res, 429, { error: "Too many requests" }); return true; }
  const token = bearer(req);
  if (!token) { json(res, 401, { error: "Identity access key required" }); return true; }
  const identity = await authenticateIdentityAccessKey(token);
  const origin = process.env.APP_ORIGIN;
  if (!origin) { json(res, 503, { error: "AgentHub origin is not configured" }); return true; }

  if (req.method === "POST" && req.url === "/api/perpl/enroll/start") {
    const data = await body(req);
    const pending = await beginPerplEnrollment({ identityId: identity.id, delegatedAccount: identity.delegatedAccount as Address, label: String(data.label ?? "AgentHub2"), origin });
    await savePendingEnrollment({ ...pending, typedData: pending.payload.typed_data, mac: pending.payload.mac });
    return json(res, 201, { enrollment_id: pending.id, public_key: pending.publicKey, typed_data: pending.payload.typed_data, mac: pending.payload.mac, expires_at: pending.expiresAt });
  }

  if (req.method === "POST" && req.url === "/api/perpl/enroll/complete") {
    const data = await body(req);
    const enrollmentId = String(data.enrollment_id ?? "");
    const walletSignature = String(data.wallet_signature ?? "") as Hex;
    if (!enrollmentId || !/^0x[0-9a-fA-F]+$/.test(walletSignature)) { json(res, 400, { error: "Enrollment ID and wallet signature are required" }); return true; }
    const pending = await getPendingEnrollment(enrollmentId, identity.id);
    if (!pending) { json(res, 404, { error: "Enrollment not found or expired" }); return true; }
    const payload = { typed_data: pending.typedData, mac: pending.mac } as any;
    const result = await enrollApiKey({ address: pending.delegatedAccount, payload, walletSignature, privateKey: pending.privateKey, origin });
    if (!await consumePendingEnrollment(enrollmentId, identity.id)) { json(res, 409, { error: "Enrollment already consumed" }); return true; }
    await savePerplSecret({ identityId: identity.id, apiKey: result.api_key, privateKey: pending.privateKey });
    return json(res, 200, { connected: true, connector: "perpl", delegated_account: identity.delegatedAccount });
  }
  json(res, 404, { error: "Not found" }); return true;
}
