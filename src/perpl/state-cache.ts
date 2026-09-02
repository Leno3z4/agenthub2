import type { PerplWsMessage } from "./types.js";
import { closePerplSession, getPerplSession } from "./session.js";
import type { PerplTradingWs } from "./trading-ws.js";

const MAX_ITEMS = 500;
type JsonObject = Record<string, unknown>;
type AccountView = { instanceId: number | null; accountId: number | null; frozen: boolean | null; forwardingEnabled: boolean | null; lastForwardedRequestId: number | null; balance: string | null; lockedBalance: string | null; updatedAt: number | null };
type State = { account: AccountView | null; orders: Map<string, JsonObject>; positions: Map<string, JsonObject>; lastMessageAt: number | null; lastHeartbeatAt: number | null; headBlock: number | null; lastSequence: number | null; sequenceGap: boolean; ordersSnapshot: boolean; positionsSnapshot: boolean };
type Subscription = { session: PerplTradingWs; unsubscribe: () => void };

const states = new Map<string, State>();
const subscriptions = new Map<string, Subscription>();

function state(identityId: string): State {
  const existing = states.get(identityId);
  if (existing) return existing;
  const created: State = { account: null, orders: new Map(), positions: new Map(), lastMessageAt: null, lastHeartbeatAt: null, headBlock: null, lastSequence: null, sequenceGap: false, ordersSnapshot: false, positionsSnapshot: false };
  states.set(identityId, created);
  return created;
}

function object(value: unknown): JsonObject | null { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null; }
function array(value: unknown): JsonObject[] { return Array.isArray(value) ? value.filter((item): item is JsonObject => !!object(item)) : []; }
function numeric(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function text(value: unknown): string | null { return typeof value === "string" ? value : null; }
function itemKey(item: JsonObject, index: number): string {
  for (const field of ["oid", "id", "pid", "position_id"]) {
    const value = item[field];
    if (typeof value === "number" || typeof value === "string") return `${field}:${String(value)}`;
  }
  return `index:${index}`;
}
function applyItems(target: Map<string, JsonObject>, items: JsonObject[], removeFlag: boolean) {
  items.forEach((item, index) => {
    const key = itemKey(item, index);
    if (removeFlag && item.r === true) target.delete(key);
    else target.set(key, item);
  });
  while (target.size > MAX_ITEMS) target.delete(target.keys().next().value!);
}
function accountFrom(message: PerplWsMessage): AccountView | null {
  const root = message as unknown as JsonObject;
  const snapshotAccounts = array(root.as);
  const data = object(snapshotAccounts[0]) ?? object(message.d) ?? root;
  const id = numeric(data.id), instanceId = numeric(data.in), balance = text(data.b), lockedBalance = text(data.lb);
  if (id === null && balance === null && lockedBalance === null) return null;
  return { instanceId, accountId: id, frozen: typeof data.fr === "boolean" ? data.fr : null, forwardingEnabled: typeof data.fw === "boolean" ? data.fw : null, lastForwardedRequestId: numeric(data.lfr), balance, lockedBalance, updatedAt: Date.now() };
}

export async function ensurePerplAccountState(identityId: string) {
  const session = await getPerplSession(identityId);
  const existingSubscription = subscriptions.get(identityId);

  if (existingSubscription?.session === session) return { subscribed: true };
  if (existingSubscription) {
    existingSubscription.unsubscribe();
    subscriptions.delete(identityId);
  }

  const current = state(identityId);
  const unsubscribe = session.onMessage((message) => {
    current.lastMessageAt = Date.now();

    if (message.mt === 19) {
      const account = accountFrom(message);
      if (account) current.account = account;
      current.lastSequence = numeric((message as unknown as JsonObject).sn);
      current.sequenceGap = false;
      return;
    }

    if (message.mt === 100) {
      const sequence = numeric(message.sn);
      const head = numeric(message.h);
      current.lastHeartbeatAt = Date.now();
      if (head !== null) current.headBlock = head;
      if (sequence !== null && current.lastSequence !== null && sequence !== current.lastSequence + 1) {
        current.sequenceGap = true;
        current.account = null;
        current.orders.clear();
        current.positions.clear();
        current.ordersSnapshot = false;
        current.positionsSnapshot = false;
        unsubscribe();
        subscriptions.delete(identityId);
        closePerplSession(identityId);
        return;
      }
      if (sequence !== null) current.lastSequence = sequence;
      return;
    }

    if ([20, 21].includes(message.mt)) {
      const account = accountFrom(message);
      if (account) current.account = account;
    }
    if (message.mt === 23) { current.orders.clear(); applyItems(current.orders, array(message.d), true); current.ordersSnapshot = true; }
    else if (message.mt === 24) applyItems(current.orders, array(message.d), true);
    if (message.mt === 26) { current.positions.clear(); applyItems(current.positions, array(message.d), true); current.positionsSnapshot = true; }
    else if (message.mt === 27) applyItems(current.positions, array(message.d), true);
  });

  subscriptions.set(identityId, { session, unsubscribe });
  return { subscribed: true };
}

function snapshotReady(current: State, staleMs: number) {
  return !current.sequenceGap && current.account !== null && current.ordersSnapshot && current.positionsSnapshot && current.lastHeartbeatAt !== null && Date.now() - current.lastHeartbeatAt <= staleMs && current.headBlock !== null;
}

export async function getPerplState(identityId: string) {
  await ensurePerplAccountState(identityId);
  const current = state(identityId);
  const staleMs = Number(process.env.PERPL_STATE_STALE_MS ?? 30_000);
  return { subscribed: !current.sequenceGap, lastMessageAt: current.lastMessageAt, stale: !snapshotReady(current, staleMs), sequenceGap: current.sequenceGap, headBlock: current.headBlock, account: current.account, orders: [...current.orders.values()], positions: [...current.positions.values()] };
}

export async function getPerplEmergencySnapshot(identityId: string) {
  await ensurePerplAccountState(identityId);
  const current = state(identityId);
  const staleMs = Number(process.env.PERPL_STATE_STALE_MS ?? 30_000);
  if (!snapshotReady(current, staleMs)) throw new Error("Perpl account state is not fresh enough for emergency action");
  return { account: current.account!, headBlock: current.headBlock!, orders: [...current.orders.values()], positions: [...current.positions.values()] };
}

export function clearPerplState(identityId: string) {
  const subscription = subscriptions.get(identityId);
  if (subscription) subscription.unsubscribe();
  subscriptions.delete(identityId);
  states.delete(identityId);
}
