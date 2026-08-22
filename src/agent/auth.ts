import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface AgentCredential { id: string; agentId: string; owner: string; delegatedAccount: string; scopes: readonly string[]; expiresAt: number; revoked: boolean; tokenHash: string; }
const credentials = new Map<string, AgentCredential>();
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function issueAgentCredential(input: { agentId: string; owner: string; delegatedAccount: string; scopes?: string[]; ttlMs?: number }) {
  const token = `ah2_${randomBytes(32).toString("base64url")}`;
  const credential: AgentCredential = { id: randomBytes(16).toString("hex"), agentId: input.agentId, owner: input.owner.toLowerCase(), delegatedAccount: input.delegatedAccount.toLowerCase(), scopes: Object.freeze(input.scopes ?? ["trade:read", "trade:write", "position:close"]), expiresAt: Date.now() + Math.min(input.ttlMs ?? 86_400_000, 86_400_000), revoked: false, tokenHash: hash(token) };
  credentials.set(credential.id, credential);
  return { id: credential.id, token, expiresAt: credential.expiresAt, scopes: credential.scopes };
}

export function authenticateAgent(token: string) {
  const tokenHash = hash(token);
  for (const credential of credentials.values()) {
    const a = Buffer.from(credential.tokenHash); const b = Buffer.from(tokenHash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) continue;
    if (credential.revoked) throw new Error("Agent credential revoked");
    if (Date.now() >= credential.expiresAt) throw new Error("Agent credential expired");
    return credential;
  }
  throw new Error("Invalid agent credential");
}

export function revokeAgentCredential(id: string) { const credential = credentials.get(id); if (!credential) return false; credential.revoked = true; return true; }
