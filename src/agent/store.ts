import type { Address } from "viem";
import type { AgentIdentity, AgentRecord } from "./identity.js";
import type { AgentCredential } from "./auth.js";

export interface IdentityRow extends AgentIdentity {}
export interface AgentRow extends AgentRecord {}
export interface CredentialRow extends AgentCredential {}

const identities = new Map<string, IdentityRow>();
const agents = new Map<string, AgentRow>();
const credentials = new Map<string, CredentialRow>();

export function saveIdentity(identity: AgentIdentity): AgentIdentity {
  identities.set(identity.id, { ...identity });
  return identity;
}

export function getIdentity(id: string): AgentIdentity | undefined {
  const value = identities.get(id);
  return value ? { ...value } : undefined;
}

export function getIdentityForOwner(owner: Address): AgentIdentity | undefined {
  const normalized = owner.toLowerCase();
  for (const identity of identities.values()) {
    if (identity.owner.toLowerCase() === normalized) return { ...identity };
  }
  return undefined;
}

export function saveAgent(agent: AgentRecord): AgentRecord {
  agents.set(agent.id, { ...agent });
  return agent;
}

export function getAgent(id: string): AgentRecord | undefined {
  const value = agents.get(id);
  return value ? { ...value } : undefined;
}

export function saveCredential(credential: AgentCredential): AgentCredential {
  credentials.set(credential.id, { ...credential });
  return credential;
}

export function getCredential(id: string): AgentCredential | undefined {
  const value = credentials.get(id);
  return value ? { ...value } : undefined;
}

export function replaceCredential(id: string, patch: Partial<CredentialRow>): AgentCredential | undefined {
  const current = credentials.get(id);
  if (!current) return undefined;
  const next = { ...current, ...patch };
  credentials.set(id, next);
  return { ...next };
}
