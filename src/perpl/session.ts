import { PerplTradingWs, type PerplTradingCredentials } from "./trading-ws.js";
import { loadPerplCredentials } from "./secret-store.js";

const sessions = new Map<string, PerplTradingWs>();

export async function getPerplSession(identityId: string): Promise<PerplTradingWs> {
  const existing = sessions.get(identityId);
  if (existing) return existing;
  const credentials: PerplTradingCredentials = await loadPerplCredentials(identityId);
  const session = new PerplTradingWs(credentials);
  await session.connect();
  sessions.set(identityId, session);
  return session;
}

export function closePerplSession(identityId: string): void {
  const session = sessions.get(identityId);
  if (!session) return;
  session.close();
  sessions.delete(identityId);
}

export function closeAllPerplSessions(): void {
  for (const identityId of sessions.keys()) closePerplSession(identityId);
}
