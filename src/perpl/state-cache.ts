import type { PerplWsMessage } from "./types.js";
import { getPerplSession } from "./session.js";

const MAX_MESSAGES_PER_STREAM = 100;
const cache = new Map<string, { messages: PerplWsMessage[]; lastMessageAt?: number }>();
const subscriptions = new Map<string, () => void>();

function configuredStreams() {
  return (process.env.PERPL_ACCOUNT_STREAMS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

export async function ensurePerplStateSubscription(identityId: string) {
  const streams = configuredStreams();
  if (!streams.length) return { subscribed: false, streams: [] as string[], lastMessageAt: undefined };
  if (!subscriptions.has(identityId)) {
    const session = await getPerplSession(identityId);
    const unsubscribe = session.onMessage((message) => {
      const stream = typeof message.stream === "string" ? message.stream : undefined;
      if (!stream || !streams.includes(stream)) return;
      const key = `${identityId}:${stream}`;
      const state = cache.get(key) ?? { messages: [] as PerplWsMessage[] };
      state.messages.push(message);
      state.lastMessageAt = Date.now();
      if (state.messages.length > MAX_MESSAGES_PER_STREAM) state.messages.splice(0, state.messages.length - MAX_MESSAGES_PER_STREAM);
      cache.set(key, state);
    });
    await session.subscribe(streams);
    subscriptions.set(identityId, unsubscribe);
  }
  return { subscribed: true, streams, lastMessageAt: streams.reduce<number | undefined>((latest, stream) => Math.max(latest ?? 0, cache.get(`${identityId}:${stream}`)?.lastMessageAt ?? 0) || latest, undefined) };
}

export async function getPerplState(identityId: string) {
  const { subscribed, streams, lastMessageAt } = await ensurePerplStateSubscription(identityId);
  return {
    subscribed,
    streams,
    lastMessageAt: lastMessageAt ?? null,
    stale: lastMessageAt ? Date.now() - lastMessageAt > Number(process.env.PERPL_STATE_STALE_MS ?? 30_000) : true,
    latest: Object.fromEntries(streams.map((stream) => [stream, cache.get(`${identityId}:${stream}`)?.messages.at(-1) ?? null])),
  };
}

export function clearPerplState(identityId: string) {
  for (const stream of configuredStreams()) cache.delete(`${identityId}:${stream}`);
  const unsubscribe = subscriptions.get(identityId);
  if (unsubscribe) unsubscribe();
  subscriptions.delete(identityId);
}
