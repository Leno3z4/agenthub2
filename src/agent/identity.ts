import { randomBytes } from "node:crypto";
import { verifyMessage, type Address, type Hex } from "viem";
import { createDbAgent, findAgentById, findIdentityById, findIdentityByOwner, upsertIdentity } from "../db/repositories.js";

const CHALLENGE_TTL_MS = 5 * 60_000;
interface IdentityChallenge { owner: Address; message: string; expiresAt: number; used: boolean; }
const challenges = new Map<string, IdentityChallenge>();

export interface AgentIdentity { id: string; owner: Address; delegatedAccount: Address; status: "active" | "revoked"; createdAt: string; }
export interface AgentRecord { id: string; identityId: string; name: string; status: "active" | "revoked"; createdAt: string; }

export function issueIdentityChallenge(owner: Address, chainId: number) {
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const message = ["AgentHub identity authorization", `Chain ID: ${chainId}`, `Owner: ${owner}`, `Nonce: ${nonce}`, `Expires: ${new Date(expiresAt).toISOString()}`, "Purpose: create or access this AgentHub identity.", "This signature does not authorize trades, withdrawals, or transfers."].join("\n");
  challenges.set(nonce, { owner, message, expiresAt, used: false });
  return { message, nonce, expiresAt };
}

export async function consumeIdentityChallenge(params: { owner: Address; message: string; signature: Hex }): Promise<boolean> {
  const match = [...challenges.values()].find((challenge) => challenge.owner.toLowerCase() === params.owner.toLowerCase() && challenge.message === params.message);
  if (!match || match.used || Date.now() >= match.expiresAt) return false;
  if (!await verifyMessage({ address: params.owner, message: params.message, signature: params.signature })) return false;
  match.used = true;
  return true;
}

export async function getIdentityById(id: string) { return findIdentityById(id); }
export async function getIdentityByOwner(owner: Address) { return findIdentityByOwner(owner); }
export async function getOrCreateIdentity(owner: Address, delegatedAccount: Address) { return upsertIdentity(owner, delegatedAccount); }
export async function createAgent(identityId: string, name = "Agent") { return createDbAgent(identityId, name); }
export async function getAgentById(id: string) { return findAgentById(id); }

export async function assertIdentityActive(identityId: string): Promise<AgentIdentity> {
  const identity = await getIdentityById(identityId);
  if (!identity || identity.status !== "active") throw new Error("Agent identity is not active");
  return identity;
}
