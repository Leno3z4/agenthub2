import { createHash, randomBytes } from "node:crypto";
import { assertIdentityActive, getAgentById, type AgentIdentity } from "./identity.js";
import { findCredentialByHash, findIdentityByAccessHash, insertAccessKey, insertCredential, revokeDbAccessKey, revokeDbCredential } from "../db/repositories.js";

export interface AgentCredential { id: string; agentId: string; identityId: string; connectionId?: string; connector?: string; owner: string; delegatedAccount: string; scopes: readonly string[]; killSwitchEnabled: boolean; expiresAt: number; revoked: boolean; tokenHash: string; }
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = (prefix: string) => `${prefix}_${randomBytes(32).toString("base64url")}`;

export async function issueIdentityAccessKey(identity: AgentIdentity, ttlMs = 30 * 24 * 60 * 60_000) { await assertIdentityActive(identity.id); const token = secret("ah2_access"); const expiresAt = Date.now() + Math.min(Math.max(ttlMs, 60_000), 30 * 24 * 60 * 60_000); const id = `key_${randomBytes(16).toString("hex")}`; await insertAccessKey({ id, identityId: identity.id, tokenHash: hash(token), expiresAt }); return { id, token, expiresAt }; }
export async function authenticateIdentityAccessKey(token: string) { const identity = await findIdentityByAccessHash(hash(token)); if (!identity) throw new Error("Invalid identity access key"); return identity; }
export async function revokeIdentityAccessKey(id: string, identityId: string) { return revokeDbAccessKey(id, identityId); }
export async function issueAgentCredential(input: { agentId: string; identityId?: string; scopes?: string[]; ttlMs?: number }) {
  const agent = await getAgentById(input.agentId); const identityId = input.identityId ?? agent?.identityId; if (!identityId) throw new Error("Agent identity is required");
  const identity = await assertIdentityActive(identityId); if (!agent || agent.identityId !== identity.id || agent.status !== "active") throw new Error("Agent is not active");
  const token = secret("ah2_agent"); const expiresAt = Date.now() + Math.min(input.ttlMs ?? 86_400_000, 86_400_000); const connectionId = `conn_${randomBytes(16).toString("hex")}`;
  const credential: AgentCredential = { id: `cred_${randomBytes(16).toString("hex")}`, agentId: agent.id, identityId: identity.id, connectionId, owner: identity.owner.toLowerCase(), delegatedAccount: identity.delegatedAccount.toLowerCase(), scopes: Object.freeze(input.scopes ?? ["trade:read", "trade:write", "position:close"]), killSwitchEnabled: identity.killSwitchEnabled, expiresAt, revoked: false, tokenHash: hash(token), connector: "perpl" };
  await insertCredential({ credential, connectionId, connector: "perpl", capabilities: credential.scopes }); return { id: credential.id, token, expiresAt, scopes: credential.scopes, identityId: identity.id, agentId: agent.id };
}
export async function authenticateAgent(token: string) { const credential = await findCredentialByHash(hash(token)); if (!credential) throw new Error("Invalid agent credential"); return credential; }
export async function revokeAgentCredential(id: string, identityId?: string) { return revokeDbCredential(id, identityId); }
