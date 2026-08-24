import type { IncomingMessage, ServerResponse } from "node:http";
import type { Address, PublicClient } from "viem";
import { authenticateAgent } from "../agent/auth.js";
import { getPerplAccountId } from "./account.js";
import { getPerplSession } from "./session.js";
import type { PerplOrderType, PerplOrderFlags } from "./types.js";
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
function numberField(value: unknown, name: string, integer = false) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || (integer && !Number.isInteger(n))) throw new Error(`Invalid ${name}`);
  return n;
}

export async function handlePerplOrderRoute(req: IncomingMessage, res: ServerResponse, publicClient: PublicClient, body: Record<string, unknown>): Promise<boolean> {
  if (req.method !== "POST" || req.url !== "/api/agent/perpl/order") return false;
  const limit = rateLimit(`agent-perpl-order:${clientIp(req.headers)}`, 30, 60_000);
  if (!limit.allowed) { json(res, 429, { error: "Too many requests" }, limit.retryAfterMs); return true; }
  const token = bearer(req);
  if (!token) { json(res, 401, { error: "Agent credential required" }); return true; }

  try {
    const credential = await authenticateAgent(token);
    const market = numberField(body.mkt, "market", true);
    const type = numberField(body.t, "order type", true) as PerplOrderType;
    const size = numberField(body.s, "size");
    const leverage = numberField(body.lv, "leverage");
    const flags = numberField(body.fl, "flags", true) as PerplOrderFlags;
    if (!Number.isInteger(market) || market < 0) throw new Error("Invalid market");
    if (!Number.isInteger(type) || type < 1 || type > 7) throw new Error("Invalid order type");
    if (size <= 0) throw new Error("Size must be positive");
    if (leverage <= 0) throw new Error("Leverage must be positive");
    if (![0, 1, 2, 4].includes(flags)) throw new Error("Invalid order flags");

    const accountId = await getPerplAccountId(publicClient, credential.delegatedAccount as Address);
    if (accountId === 0n) return json(res, 409, { error: "Perpl account is not initialized" }) as unknown as true;

    const input = {
      mkt: market,
      acc: Number(accountId),
      t: type,
      s: size,
      lv: leverage,
      fl: flags,
      ...(body.p !== undefined ? { p: numberField(body.p, "price") } : {}),
      ...(body.a !== undefined ? { a: String(body.a) } : {}),
      ...(body.ms !== undefined ? { ms: numberField(body.ms, "market slippage", true) } : {}),
      ...(body.tif !== undefined ? { tif: numberField(body.tif, "time in force", true) } : {}),
      ...(body.tp !== undefined ? { tp: numberField(body.tp, "take profit") } : {}),
      ...(body.tpc !== undefined ? { tpc: numberField(body.tpc, "take profit config") } : {}),
      ...(body.tr !== undefined ? { tr: numberField(body.tr, "stop loss") } : {}),
      ...(body.lp !== undefined ? { lp: numberField(body.lp, "limit price") } : {}),
      ...(body.bf !== undefined ? { bf: numberField(body.bf, "builder fee") } : {}),
    } as const;

    const session = await getPerplSession(credential.identityId);
    const result = await session.placeOrderAndWait(input, 10_000);
    return json(res, 200, { connector: "perpl", perpl_account_id: accountId.toString(), request_id: result.rq, response: result.response ?? null }) as unknown as true;
  } catch (error) {
    const message = error instanceof Error && /Invalid|positive|initialized/.test(error.message) ? error.message : "Unable to place Perpl order";
    json(res, 400, { error: message });
    return true;
  }
}
