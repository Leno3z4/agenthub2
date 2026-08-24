import type { PerplWsMessage } from "./types.js";
import { getPerplSession } from "./session.js";

const MAX_MESSAGES = 100;

type StateBucket = { latest?: PerplWsMessage; lastMessageAt?: number; messages: PerplWsMessage[] };

const buckets = new Map<string, StateBucket>();
const subscriptions = new Map<string, () => void>();

const KIND_BY_MT: Record<number, string> = {
  19: "wallet",
  20: "wallet",
  23: "orders",
  24: "orders",
  26: "positions",
  27: "positions",
};

function bucket(identityId: string, kind: string) {
  const key = `${identityId}:${kind}`;
  const state = buckets.get(key) ?? { messages: [] };
  buckets.set(key, state);
  return state;
}

export async function ensurePerplAccountState(identityId: string) {
  if (!subscriptions.has(identityId)) {
    const session = await getPerplSession(identityId);
    const unsubscribe = session.onMessage((message) => {
      const kind = KIND_BY_MT[message.mt];
      if (!kind) return;
      const state = bucket(identityId, kind);
      state.latest = message;
      state.lastMessageAt = Date.now();
      state.messages.push(message);
      if (state.messages.length > MAX_MESSAGES) state.messages.splice(0, state.messages.length - MAX_MESSAGES);
    });
    subscriptions.set(identityId, unsubscribe);
  }
  return { subscribed: true };
}

function read(identityId: string, kind: string) {
  const state = buckets.get(`${identityId}:${kind}`);
  return { data: state?.latest ?? null, lastMessageAt: state?.lastMessageAt ?? null };
}

export async function getPerplState(identityId: string) {
  await ensurePerplAccountState(identityId);
  const wallet = read(identityId, "wallet");
  const orders = read(identityId, "orders");
  const positions = read(identityId, "positions");
  const timestamps = [wallet.lastMessageAt, orders.lastMessageAt, positions.lastMessageAt].filter((value): value is number => value !== null);
  const lastMessageAt = timestamps.length ? Math.max(...timestamps) : null;
  const staleMs = Number(process.env.PERPL_STATE_STALE_MS ?? 30_000);
  return {
    subscribed: true,
    lastMessageAt,
    stale: lastMessageAt === null || Date.now() - lastMessageAt > staleMs,
    wallet,
    orders,
    positions,
  };
}

export function clearPerplState(identityId: string) {
  for (const kind of ["wallet", "orders", "positions"]) buckets.delete(`${identityId}:${kind}`);
  const unsubscribe = subscriptions.get(identityId);
  if (unsubscribe) unsubscribe();
  subscriptions.delete(identityId);
}
