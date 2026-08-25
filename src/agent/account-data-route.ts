import type { IncomingMessage, ServerResponse } from "node:http";
import { authenticateIdentityAccessKey } from "./auth.js";
import { getPerplState } from "../perpl/state-cache.js";
import { getPerplAccountState } from "../perpl/account-state.js";
import { clientIp, rateLimit } from "../security/rate-limit.js";
import type { Address, PublicClient } from "viem";

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

export async function handleAccountDataRoute(
  req: IncomingMessage,
  res: ServerResponse,
  publicClient: PublicClient,
): Promise<boolean> {
  if (req.method !== "GET" || req.url !== "/api/account/state") return false;

  const limit = rateLimit(`account-state:${clientIp(req.headers)}`, 60, 60_000);
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

  try {
    const identity = await authenticateIdentityAccessKey(token);
    const account = await getPerplAccountState({
      identityId: identity.id,
      delegatedAccount: identity.delegatedAccount as Address,
      publicClient,
    });
    const state = await getPerplState(identity.id);
    json(res, 200, {
      identity_id: identity.id,
      owner: identity.owner,
      ...account,
      state,
    });
  } catch {
    json(res, 409, { error: "Account data is unavailable" });
  }

  return true;
}
