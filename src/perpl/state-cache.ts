import type { PerplWsMessage } from "./types.js";
import { getPerplSession } from "./session.js";

const MAX_ITEMS = 500;
type JsonObject = Record<string, unknown>;
type AccountView = { instanceId: number | null; accountId: number | null; frozen: boolean | null; forwardingEnabled: boolean | null; lastForwardedRequestId: number | null; balance: string | null; lockedBalance: string | null; updatedAt: number | null };
type State = { account: AccountView | null; orders: Map<string, JsonObject>; positions: Map<string, JsonObject>; lastMessageAt: number | null };
const states = new Map<string, State>();
const subscriptions = new Map<string, () => void>();

function state(identityId: string): State { const existing = states.get(identityId); if (existing) return existing; const created: State = { account: null, orders: new Map(), positions: new Map(), lastMessageAt: null }; states.set(identityId, created); return created; }
function object(value: unknown): JsonObject | null { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null; }
function array(value: unknown): JsonObject[] { return Array.isArray(value) ? value.filter((item): item is JsonObject => !!object(item)) : []; }
function numeric(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function text(value: unknown): string | null { return typeof value === "string" ? value : null; }
function itemKey(item: JsonObject, index: number): string { for (const field of ["oid", "id", "pid", "position_id"]) { const value = item[field]; if (typeof value === "number" || typeof value === "string") return `${field}:${String(value)}`; } return `index:${index}`; }
function applyItems(target: Map<string, JsonObject>, items: JsonObject[], removeFlag: boolean) { items.forEach((item, index) => { const key = itemKey(item, index); if (removeFlag && item.r === true) target.delete(key); else target.set(key, item); }); while (target.size > MAX_ITEMS) target.delete(target.keys().next().value!); }
function accountFrom(message: PerplWsMessage): AccountView | null { const data = object(message.d) ?? message as unknown as JsonObject; const id = numeric(data.id), instanceId = numeric(data.in), balance = text(data.b), lockedBalance = text(data.lb); if (id === null && balance === null && lockedBalance === null) return null; return { instanceId, accountId: id, frozen: typeof data.fr === "boolean" ? data.fr : null, forwardingEnabled: typeof data.fw === "boolean" ? data.fw : null, lastForwardedRequestId: numeric(data.lfr), balance, lockedBalance, updatedAt: Date.now() }; }

export async function ensurePerplAccountState(identityId: string) {
  if (subscriptions.has(identityId)) return { subscribed: true };
  const session = await getPerplSession(identityId); const current = state(identityId);
  const unsubscribe = session.onMessage((message) => {
    current.lastMessageAt = Date.now();
    if ([19, 20, 21].includes(message.mt)) { const account = accountFrom(message); if (account) current.account = account; }
    if ([23, 24].includes(message.mt)) applyItems(current.orders, array(message.d), true);
    if ([26, 27].includes(message.mt)) applyItems(current.positions, array(message.d), false);
  });
  subscriptions.set(identityId, unsubscribe); return { subscribed: true };
}

export async function getPerplState(identityId: string) {
  await ensurePerplAccountState(identityId); const current = state(identityId); const staleMs = Number(process.env.PERPL_STATE_STALE_MS ?? 30_000);
  return { subscribed: true, lastMessageAt: current.lastMessageAt, stale: current.lastMessageAt === null || Date.now() - current.lastMessageAt > staleMs, account: current.account, orders: [...current.orders.values()], positions: [...current.positions.values()] };
}

export function clearPerplState(identityId: string) { const unsubscribe = subscriptions.get(identityId); if (unsubscribe) unsubscribe(); subscriptions.delete(identityId); states.delete(identityId); }
