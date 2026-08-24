import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { assertIdentityActive, getAgentById, getIdentityById, type AgentIdentity } from "./identity.js";

export interface AgentCredential {
  id: string;
  agentId: string;
  identityId: string;
  owner: string;
  delegatedAccount: string;
  scopes: readonly string[];
  expiresAt: number;
  revoked: boolean;
  tokenHash: string;
}

interface AccessKey {
  id: string;
  identityId: string;
  tokenHash: string;
  expiresAt: number;
  revoked: boolean;
  createdAt: number;
}

const credentials = new Map<string, AgentCredential>();
const accessKeys = new Map<string, AccessKey>();
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = (prefix: string) => `${prefix}_${randomBytes(32).toString("base64url")}`;

function equalHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function issueIdentityAccessKey(identity: AgentIdentity, ttlMs = 30 * 24 * 60 * 60_000) {
  assertIdentityActive(identity.id);
  const token = secret("ah2_access");
  const record: AccessKey = {
    id: `key_${randomBytes(16).toString("hex")}`,
    identityId: identity.id,
    tokenHash: hash(token),
    expiresAt: Date.now() + Math.min(Math.max(ttlMs, 60_000), 30 * 24 * 60 * 60_000),
    revoked: false,
    createdAt: Date.now(),
  };
  accessKeys.set(record.id, record);
  return { id: record.id, token, expiresAt: record.expiresAt };
}

export function authenticateIdentityAccessKey(token: string): AgentIdentity {
  const tokenHash = hash(token);
  for (const accessKey of accessKeys.values()) {
    if (!equalHash(accessKey.tokenHash, tokenHash)) continue;
    if (accessKey.revoked || Date.now() >= accessKey.expiresAt) throw new Error("Invalid identity access key");
    return assertIdentityActive(accessKey.identityId);
  }
  throw new Error("Invalid identity access key");
}

export function revokeIdentityAccessKey(id: string, identityId: string): boolean {
  const key = accessKeys.get(id);
  if (!key || key.identityId !== identityId) return false;
  key.revoked = true;
  return true;
}

export function issueAgentCredential(input: { agentId: string; identityId?: string; scopes?: string[]; ttlMs?: number }) {
  const agent = getAgentById(input.agentId);
  const identityId = input.identityId ?? agent?.identityId;
  if (!identityId) throw new Error("Agent identity is required");
  const identity = assertIdentityActive(identityId);
  if (!agent || agent.identityId !== identity.id || agent.status !== "active") throw new Error("Agent is not active");

  const token = secret("ah2_agent");
  const credential: AgentCredential = {
    id: `cred_${randomBytes(16).toString("hex")}`,
    agentId: agent.id,
    identityId: identity.id,
    owner: identity.owner.toLowerCase(),
    delegatedAccount: identity.delegatedAccount.toLowerCase(),
    scopes: Object.freeze(input.scopes ?? ["trade:read", "trade:write", "position:close"]),
    expiresAt: Date.now() + Math.min(input.ttlMs ?? 86_400_000, 86_400_000),
    revoked: false,
    tokenHash: hash(token),
  };
  credentials.set(credential.id, credential);
  return { id: credential.id, token, expiresAt: credential.expiresAt, scopes: credential.scopes, identityId: identity.id, agentId: agent.id };
}

export function authenticateAgent(token: string): AgentCredential {
  const tokenHash = hash(token);
  for (const credential of credentials.values()) {
    if (!equalHash(credential.tokenHash, tokenHash)) continue;
    if (credential.revoked || Date.now() >= credential.expiresAt) throw new Error("Invalid agent credential");
    const identity = getIdentityById(credential.identityId);
    const agent = getAgentById(credential.agentId);
    if (!identity || identity.status !== "active" || !agent || agent.status !== "active" || agent.identityId !== credential.identityId) throw new Error("Invalid agent credential");
    return credential;
  }
  throw new Error("Invalid agent credential");
}

export function revokeAgentCredential(id: string, identityId?: string) {
  const credential = credentials.get(id);
  if (!credential || (identityId && credential.identityId !== identityId)) return false;
  credential.revoked = true;
  return true;
}
