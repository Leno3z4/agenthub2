import type { IncomingMessage, ServerResponse } from "node:http";
import type { Address, Hex } from "viem";
import { authenticateIdentityAccessKey } from "../agent/auth.js";
import { beginPerplEnrollment } from "./secure-enrollment.js";
import {
  claimPendingEnrollment,
  finishClaimedEnrollment,
  releaseClaimedEnrollment,
  savePendingEnrollment,
  savePerplSecret,
} from "./enrollment-store.js";
import { enrollApiKey } from "./enrollment.js";
import { rateLimit, clientIp } from "../security/rate-limit.js";

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function bearer(req: IncomingMessage) {
  const value = req.headers.authorization;
  return typeof value === "string" && value.startsWith("Bearer ")
    ? value.slice(7).trim()
    : "";
}

function requestOrigin(req: IncomingMessage) {
  const origin = req.headers.origin;
  if (typeof origin === "string" && /^https?:\/\/[^\s/]+(?:\/)?$/.test(origin)) {
    return origin.replace(/\/$/, "");
  }
  const configured = process.env.APP_ORIGIN?.trim().replace(/\/$/, "");
  return configured || "";
}

async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const part = Buffer.from(chunk);
    size += part.length;

    if (size > 16_384) throw new Error("Request body too large");
    chunks.push(part);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

export async function handlePerplRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  if (!req.url || !req.method || !req.url.startsWith("/api/perpl/enroll/")) return false;

  const limit = rateLimit(`perpl-enroll:${clientIp(req.headers)}`, 8, 60_000);
  if (!limit.allowed) {
    res.setHeader("retry-after", String(Math.ceil(limit.retryAfterMs / 1000)));
    json(res, 429, { error: "Too many requests" });
    return true;
  }

  const token = bearer(req);
  if (!token) {
    json(res, 401, { error: "Identity access key required" });
    return true;
  }

  const identity = await authenticateIdentityAccessKey(token);
  const origin = requestOrigin(req);

  if (!origin) {
    json(res, 503, { error: "AgentHub origin is not configured" });
    return true;
  }

  if (req.method === "POST" && req.url === "/api/perpl/enroll/start") {
    const data = await body(req);
    const walletOwner = String(data.wallet_address ?? "").trim() as Address;

    if (!/^0x[0-9a-fA-F]{40}$/.test(walletOwner)) {
      json(res, 400, { error: "Connected wallet address is required" });
      return true;
    }

    if (walletOwner.toLowerCase() !== identity.owner.toLowerCase()) {
      json(res, 403, { error: "Connected wallet does not own this AgentHub account" });
      return true;
    }

    try {
      const pending = await beginPerplEnrollment({
        identityId: identity.id,
        walletOwner,
        delegatedAccount: identity.delegatedAccount as Address,
        label: String(data.label ?? "AgentHub2"),
        origin,
      });

      await savePendingEnrollment({
        ...pending,
        typedData: pending.payload.typed_data,
        mac: pending.payload.mac,
      });

      json(res, 201, {
        enrollment_id: pending.id,
        public_key: pending.publicKey,
        typed_data: pending.payload.typed_data,
        mac: pending.payload.mac,
        expires_at: pending.expiresAt,
      });
    } catch (error) {
      json(res, 502, {
        error: error instanceof Error ? error.message : "Perpl enrollment payload request failed",
      });
    }
    return true;
  }

  if (req.method === "POST" && req.url === "/api/perpl/enroll/complete") {
    const data = await body(req);
    const enrollmentId = String(data.enrollment_id ?? "");
    const walletSignature = String(data.wallet_signature ?? "") as Hex;

    if (!enrollmentId || !/^0x[0-9a-fA-F]+$/.test(walletSignature)) {
      json(res, 400, { error: "Enrollment ID and wallet signature are required" });
      return true;
    }

    const pending = await claimPendingEnrollment(enrollmentId, identity.id);
    if (!pending) {
      json(res, 404, { error: "Enrollment not found, expired, or already processing" });
      return true;
    }

    try {
      const payload = { typed_data: pending.typedData, mac: pending.mac } as any;
      const result = await enrollApiKey({
        address: identity.owner as Address,
        payload,
        walletSignature,
        privateKey: pending.privateKey,
        origin,
        targetProfile: pending.delegatedAccount,
      });

      await savePerplSecret({
        identityId: identity.id,
        apiKey: result.api_key,
        privateKey: pending.privateKey,
      });

      if (!await finishClaimedEnrollment(enrollmentId, identity.id)) {
        throw new Error("Unable to finalize Perpl enrollment");
      }

      json(res, 200, { ok: true });
    } catch (error) {
      await releaseClaimedEnrollment(enrollmentId, identity.id).catch(() => undefined);
      json(res, 502, {
        error: error instanceof Error ? error.message : "Perpl enrollment failed",
      });
    }
    return true;
  }

  json(res, 404, { error: "Not found" });
  return true;
}
