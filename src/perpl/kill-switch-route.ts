import type { IncomingMessage, ServerResponse } from "node:http";
import type { Address, PublicClient } from "viem";
import { authenticateAgent } from "../agent/auth.js";
import { assertIdentityActive } from "../agent/identity.js";
import { setIdentityKillSwitch } from "../db/repositories.js";
import { recordAuditEvent } from "../security/audit.js";
import { clientIp, rateLimit } from "../security/rate-limit.js";
import { getMarket } from "./api.js";
import { getPerplAccountId } from "./account.js";
import { getPerplEmergencySnapshot } from "./state-cache.js";
import { getPerplSession } from "./session.js";

function json(res: ServerResponse, status: number, body: unknown, retryAfterMs = 0) { if (retryAfterMs) res.setHeader("retry-after", String(Math.ceil(retryAfterMs / 1000))); res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); }
function bearer(req: IncomingMessage) { const value = req.headers.authorization; return typeof value === "string" && value.startsWith("Bearer ") ? value.slice(7).trim() : ""; }
function num(value: unknown) { const n = typeof value === "number" ? value : Number(value); return Number.isFinite(n) ? n : undefined; }
function hasScope(scopes: readonly string[], scope: string) { return scopes.includes(scope); }
async function audit(input: Parameters<typeof recordAuditEvent>[0]) { try { await recordAuditEvent(input); } catch {} }

async function waitForFlat(identityId: string, attempts = 8) {
  for (let i = 0; i < attempts; i++) { const snapshot = await getPerplEmergencySnapshot(identityId); if (snapshot.orders.length === 0 && snapshot.positions.filter((p) => num(p.st) === 1).length === 0) return snapshot; await new Promise((resolve) => setTimeout(resolve, 400)); }
  return getPerplEmergencySnapshot(identityId);
}

export async function handlePerplKillSwitchRoute(req: IncomingMessage, res: ServerResponse, publicClient: PublicClient, body: Record<string, unknown>): Promise<boolean> {
  if (req.method !== "POST" || req.url !== "/api/agent/perpl/kill-switch") return false;
  const limit = rateLimit(`perpl-kill-switch:${clientIp(req.headers)}`, 5, 60_000); if (!limit.allowed) { json(res, 429, { error: "Too many kill-switch requests" }, limit.retryAfterMs); return true; }
  const token = bearer(req); if (!token) { json(res, 401, { error: "Agent credential required" }); return true; }
  let identityId: string | undefined; let agentId: string | undefined; let connectionId: string | undefined;
  try {
    const credential = await authenticateAgent(token); identityId = credential.identityId; agentId = credential.agentId; connectionId = credential.connectionId;
    if (!hasScope(credential.scopes, "position:close") || !hasScope(credential.scopes, "trade:write")) { json(res, 403, { error: "Kill switch requires position:close and trade:write" }); return true; }
    const identity = await assertIdentityActive(identityId);
    const enabled = body.enabled === undefined ? true : body.enabled === true;
    if (!enabled) { const updated = await setIdentityKillSwitch(identityId, false); await audit({ identityId, agentId, connectionId, action: "perpl.kill_switch.disable", outcome: "success", ipAddress: clientIp(req.headers) }); json(res, 200, { kill_switch_enabled: updated.killSwitchEnabled, identity_id: identityId }); return true; }
    if (identity.killSwitchEnabled) { json(res, 200, { kill_switch_enabled: true, already_active: true, identity_id: identityId }); return true; }
    await setIdentityKillSwitch(identityId, true);
    const snapshot = await getPerplEmergencySnapshot(identityId);
    const exchange = process.env.PERPL_EXCHANGE_ADDRESS as Address | undefined; if (!exchange) throw new Error("Perpl exchange is not configured");
    const accountId = await getPerplAccountId(publicClient, credential.delegatedAccount as Address, exchange); if (accountId === 0n || accountId > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Perpl account is not initialized");
    const session = await getPerplSession(identityId); const results: Array<Record<string, unknown>> = [];
    for (const order of snapshot.orders) {
      const oid = num(order.oid); const mkt = num(order.mkt); if (oid === undefined || mkt === undefined) { results.push({ kind: "cancel", status: "unresolved", reason: "Missing order ID or market" }); continue; }
      try { const market = await getMarket(mkt); const lb = snapshot.headBlock + market.order_ttl_blocks; const result = await session.cancelOrder({ mkt, acc: Number(accountId), oid, lb }); results.push({ kind: "cancel", orderId: oid, market: mkt, status: "submitted", requestId: result.rq }); } catch (error) { results.push({ kind: "cancel", orderId: oid, market: mkt, status: "failed", reason: error instanceof Error ? error.message : "unknown" }); }
    }
    for (const position of snapshot.positions) {
      const status = num(position.st); const direction = num(position.sd); const size = num(position.s); const leverage = num(position.lv); const mkt = num(position.mkt); if (status !== 1) continue;
      if (direction !== 1 && direction !== 2 || size === undefined || leverage === undefined || mkt === undefined) { results.push({ kind: "close", status: "unresolved", reason: "Missing position market, direction, size, or leverage" }); continue; }
      try { const market = await getMarket(mkt); if (!market.config.is_open) { results.push({ kind: "close", market: mkt, status: "unresolved", reason: "Market is closed" }); continue; } const lb = snapshot.headBlock + market.order_ttl_blocks; const result = await session.closePosition({ mkt, acc: Number(accountId), direction, size, leverage, lb, maxSlippageBps: market.config.order_max_market_slippage_bps }); results.push({ kind: "close", market: mkt, status: "submitted", requestId: result.rq }); } catch (error) { results.push({ kind: "close", market: mkt, status: "failed", reason: error instanceof Error ? error.message : "unknown" }); }
    }
    let finalSnapshot = await waitForFlat(identityId);
    if (finalSnapshot.orders.length || finalSnapshot.positions.some((p) => num(p.st) === 1)) {
      await audit({ identityId, agentId, connectionId, action: "perpl.kill_switch", outcome: "blocked", ipAddress: clientIp(req.headers), metadata: { remainingOrders: finalSnapshot.orders.length, remainingPositions: finalSnapshot.positions.filter((p) => num(p.st) === 1).length, results } });
      json(res, 409, { kill_switch_enabled: true, closed: false, partial: true, remaining_orders: finalSnapshot.orders.length, remaining_positions: finalSnapshot.positions.filter((p) => num(p.st) === 1).length, results }); return true;
    }
    await audit({ identityId, agentId, connectionId, action: "perpl.kill_switch", outcome: "success", ipAddress: clientIp(req.headers), metadata: { results } });
    json(res, 200, { kill_switch_enabled: true, closed: true, remaining_orders: 0, remaining_positions: 0, results });
  } catch (error) {
    if (identityId) await audit({ identityId, agentId, connectionId, action: "perpl.kill_switch", outcome: "failure", ipAddress: clientIp(req.headers), metadata: { reason: error instanceof Error ? error.message : "unknown" } });
    json(res, 400, { error: error instanceof Error && /Missing|closed|configured|initialized|fresh|requires/.test(error.message) ? error.message : "Unable to execute kill switch" });
  }
  return true;
}
