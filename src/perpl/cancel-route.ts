import type { IncomingMessage, ServerResponse } from "node:http";
import type { Address, PublicClient } from "viem";
import { authenticateAgent } from "../agent/auth.js";
import { recordAuditEvent } from "../security/audit.js";
import { clientIp, rateLimit } from "../security/rate-limit.js";
import { getPerplAccountId } from "./account.js";
import { getPerplSession } from "./session.js";

function json(res: ServerResponse, status: number, body: unknown, retryAfterMs = 0) { if (retryAfterMs > 0) res.setHeader("retry-after", String(Math.ceil(retryAfterMs / 1000))); res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); }
function bearer(req: IncomingMessage) { const value = req.headers.authorization; return typeof value === "string" && value.startsWith("Bearer ") ? value.slice(7).trim() : ""; }
function integer(value: unknown, name: string) { const n = Number(value); if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid ${name}`); return n; }

export async function handlePerplCancelRoute(req: IncomingMessage, res: ServerResponse, publicClient: PublicClient, body: Record<string, unknown>): Promise<boolean> {
  if (req.method !== "POST" || req.url !== "/api/agent/perpl/order/cancel") return false;
  const limit = rateLimit(`agent-perpl-cancel:${clientIp(req.headers)}`, 20, 60_000); if (!limit.allowed) { json(res, 429, { error: "Too many requests" }, limit.retryAfterMs); return true; }
  const token = bearer(req); if (!token) { json(res, 401, { error: "Agent credential required" }); return true; }
  let identityId: string | undefined; let agentId: string | undefined; let connectionId: string | undefined;
  try {
    const credential = await authenticateAgent(token); identityId = credential.identityId; agentId = credential.agentId; connectionId = credential.connectionId;
    const market = integer(body.mkt, "market"); const oid = integer(body.oid, "order ID"); const lb = integer(body.lb ?? 0, "execution block");
    const exchange = process.env.PERPL_EXCHANGE_ADDRESS as Address | undefined; if (!exchange) throw new Error("Perpl exchange is not configured");
    const accountId = await getPerplAccountId(publicClient, credential.delegatedAccount as Address, exchange); if (accountId === 0n) throw new Error("Perpl account is not initialized");
    if (accountId > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Perpl account ID is outside the supported numeric range");
    const result = await getPerplSession(identityId).then((session) => session.cancelOrder({ mkt: market, acc: Number(accountId), oid, lb }));
    await recordAuditEvent({ identityId, agentId, connectionId, action: "perpl.order.cancel", outcome: "success", requestId: String(result.rq), ipAddress: clientIp(req.headers), userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined, metadata: { market, orderId: oid } });
    json(res, 200, { connector: "perpl", perpl_account_id: accountId.toString(), request_id: result.rq, sequence: result.sn, response: result.outcome ?? null });
  } catch (error) {
    try { await recordAuditEvent({ identityId, agentId, connectionId, action: "perpl.order.cancel", outcome: "failure", ipAddress: clientIp(req.headers), userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined, metadata: { reason: error instanceof Error ? error.message.replace(/token|key|secret|private/gi, "redacted") : "unknown" } }); } catch {}
    json(res, 400, { error: error instanceof Error && /Invalid|initialized|configured/.test(error.message) ? error.message : "Unable to cancel Perpl order" });
  }
  return true;
}
