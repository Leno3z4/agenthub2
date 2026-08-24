import type { IncomingMessage, ServerResponse } from "node:http";
import type { Address, PublicClient } from "viem";
import { authenticateAgent } from "../agent/auth.js";
import { getPerplAccountState } from "./account-state.js";
import { clientIp, rateLimit } from "../security/rate-limit.js";

function json(res: ServerResponse, status: number, body: unknown, retryAfterMs = 0) {
  if (retryAfterMs > 0) res.setHeader("retry-after", String(Math.ceil(retryAfterMs / 1000)));
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}
function bearer(req: IncomingMessage) {
  const value = req.headers.authorization;
  return typeof value === "string" && value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export async function handlePerplAccountRoute(req: IncomingMessage, res: ServerResponse, publicClient: PublicClient): Promise<boolean> {
  if (req.method !== "GET" || req.url !== "/api/agent/perpl/account") return false;
  const limit = rateLimit(`agent-perpl-account:${clientIp(req.headers)}`, 60, 60_000);
  if (!limit.allowed) { json(res, 429, { error: "Too many requests" }, limit.retryAfterMs); return true; }
  const token = bearer(req);
  if (!token) { json(res, 401, { error: "Agent credential required" }); return true; }
  try {
    const credential = await authenticateAgent(token);
    const state = await getPerplAccountState({ identityId: credential.identityId, delegatedAccount: credential.delegatedAccount as Address, publicClient });
    json(res, 200, state);
  } catch {
    json(res, 409, { error: "Perpl account is not connected" });
  }
  return true;
}
