import type { IncomingMessage, ServerResponse } from "node:http";
import { authenticateAgent } from "../agent/auth.js";
import { clientIp, rateLimit } from "../security/rate-limit.js";
import { getPerplState } from "./state-cache.js";

function json(res: ServerResponse, status: number, body: unknown, retryAfterMs = 0) {
  if (retryAfterMs > 0) res.setHeader("retry-after", String(Math.ceil(retryAfterMs / 1000)));
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}
function bearer(req: IncomingMessage) { const value = req.headers.authorization; return typeof value === "string" && /^Bearer\s+/i.test(value) ? value.replace(/^Bearer\s+/i, "").trim() : ""; }

export async function handlePerplStateRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method !== "GET" || req.url !== "/api/agent/perpl/state") return false;
  const limit = rateLimit(`agent-perpl-state:${clientIp(req.headers)}`, 30, 60_000);
  if (!limit.allowed) { json(res, 429, { error: "Too many requests" }, limit.retryAfterMs); return true; }
  const token = bearer(req);
  if (!token) { json(res, 401, { error: "Agent credential required" }); return true; }
  try {
    const credential = await authenticateAgent(token);
    const state = await getPerplState(credential.identityId);
    const status = state.sequenceGap ? "sequence_gap" : state.stale ? "stale" : state.account ? "connected" : "disconnected";
    json(res, 200, {
      status,
      trading_available: status === "connected",
      connector: credential.connector ?? "perpl",
      connection_id: credential.connectionId ?? null,
      identity_id: credential.identityId,
      agent_id: credential.agentId,
      delegated_account: credential.delegatedAccount,
      account: state.account,
      orders: state.orders,
      positions: state.positions,
      head_block: state.headBlock,
      stale: state.stale,
      sequence_gap: state.sequenceGap,
      last_message_at: state.lastMessageAt,
    });
  } catch { json(res, 409, { error: "Perpl state is unavailable" }); }
  return true;
}
