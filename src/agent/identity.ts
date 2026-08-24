import { randomBytes } from "node:crypto";
import { verifyMessage, type Address, type Hex } from "viem";

const CHALLENGE_TTL_MS = 5 * 60_000;

export interface AgentIdentity {
  id: string;
  owner: Address;
  delegatedAccount: Address;
  status: "active" | "revoked";
  createdAt: string;
}

export interface AgentRecord {
  id: string;
  identityId: string;
  name: string;
  status: "active" | "revoked";
  createdAt: string;
}

interface IdentityChallenge {
  owner: Address;
  nonce: string;
  message: string;
  expiresAt: number;
  used: boolean;
}

const identitiesById = new Map<string, AgentIdentity>();
const identityIdByOwner = new Map<string, string>();
const agentsById = new Map<string, AgentRecord>();
const challenges = new Map<string, IdentityChallenge>();

function key(address: string): string {
  return address.toLowerCase();
}

function randomId(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

export function issueIdentityChallenge(owner: Address, chainId: number) {
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const message = [
    "AgentHub identity authorization",
    `Chain ID: ${chainId}`,
    `Owner: ${owner}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
    "Purpose: create or access this AgentHub identity.",
    "This signature does not authorize trades, withdrawals, or transfers.",
  ].join("\n");

  challenges.set(nonce, { owner, nonce, message, expiresAt, used: false });
  return { message, nonce, expiresAt };
}

export async function consumeIdentityChallenge(params: {
  owner: Address;
  message: string;
  signature: Hex;
}): Promise<boolean> {
  const match = [...challenges.values()].find(
    (challenge) => challenge.owner.toLowerCase() === params.owner.toLowerCase() && challenge.message === params.message,
  );

  if (!match || match.used || Date.now() >= match.expiresAt) return false;

  const valid = await verifyMessage({ address: params.owner, message: params.message, signature: params.signature });
  if (!valid) return false;

  match.used = true;
  return true;
}

export function getIdentityById(id: string): AgentIdentity | undefined {
  return identitiesById.get(id);
}

export function getIdentityByOwner(owner: Address): AgentIdentity | undefined {
  const id = identityIdByOwner.get(key(owner));
  return id ? identitiesById.get(id) : undefined;
}

export function getOrCreateIdentity(owner: Address, delegatedAccount: Address): AgentIdentity {
  const existing = getIdentityByOwner(owner);
  if (existing) {
    if (existing.status !== "active") throw new Error("Agent identity revoked");
    if (existing.delegatedAccount.toLowerCase() !== delegatedAccount.toLowerCase()) {
      throw new Error("Delegated account does not match AgentHub identity");
    }
    return existing;
  }

  const identity: AgentIdentity = {
    id: `id_${randomId(16)}`,
    owner,
    delegatedAccount,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  identitiesById.set(identity.id, identity);
  identityIdByOwner.set(key(owner), identity.id);
  return identity;
}

export function createAgent(identityId: string, name = "Agent"): AgentRecord {
  const identity = getIdentityById(identityId);
  if (!identity || identity.status !== "active") throw new Error("Agent identity is not active");

  const agent: AgentRecord = {
    id: `agent_${randomId(16)}`,
    identityId,
    name: name.trim().slice(0, 64) || "Agent",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  agentsById.set(agent.id, agent);
  return agent;
}

export function getAgentById(id: string): AgentRecord | undefined {
  return agentsById.get(id);
}

export function assertIdentityActive(identityId: string): AgentIdentity {
  const identity = getIdentityById(identityId);
  if (!identity || identity.status !== "active") throw new Error("Agent identity is not active");
  return identity;
}
