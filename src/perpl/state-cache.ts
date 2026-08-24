import type { PerplWsMessage } from "./types.js";
import { getPerplSession } from "./session.js";

const MAX_MESSAGES_PER_STREAM = 100;
const cache = new Map<string, PerplWsMessage[]>();
const subscriptions = new Map<string, () => void>();

function configuredStreams() {
  return (process.env.PERPL_ACCOUNT_STREAMS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

export async function ensurePerplStateSubscription(identityId: string) {
  const streams = configuredStreams();
  if (!streams.length) return { subscribed: false, streams: [] as string[] };
  const key = identityId;
  if (!subscriptions.has(key)) {
    const session = await getPerplSession(identityId);
    const unsubscribe = session.onMessage((message) => {
      const stream = typeof message.stream === "string" ? message.stream : undefined;
      if (!stream || !streams.includes(stream)) return;
      const items = cache.get(`${key}:${stream}`) ?? [];
      items.push(message);
      if (items.length > MAX_MESSAGES_PER_STREAM) items.splice(0, items.length - MAX_MESSAGES_PER_STREAM);
      cache.set(`${key}:${stream}`, items);
    });
    await session.subscribe(streams);
    subscriptions.set(key, unsubscribe);
  }
  return { subscribed: true, streams };
}

export async function getPerplState(identityId: string) {
  const { subscribed, streams } = await ensurePerplStateSubscription(identityId);
  return {
    subscribed,
    streams,
    latest: Object.fromEntries(streams.map((stream) => [stream, (cache.get(`${identityId}:${stream}`) ?? []).at(-1) ?? null])),
  };
}

export function clearPerplState(identityId: string) {
  for (const stream of configuredStreams()) cache.delete(`${identityId}:${stream}`);
  const unsubscribe = subscriptions.get(identityId);
  if (unsubscribe) unsubscribe();
  subscriptions.delete(identityId);
}
