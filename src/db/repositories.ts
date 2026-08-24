import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import type { Address } from "viem";
import { getDb } from "./client.js";
import type { AgentCredential } from "../agent/auth.js";
import type { AgentIdentity, AgentRecord } from "../agent/identity.js";

type QueryRunner = { query: PoolClient["query"] };
const db: QueryRunner = getDb();

function identity(row: any): AgentIdentity {
  return { id: row.id, owner: row.owner_address, delegatedAccount: row.delegated_account, status: row.status, createdAt: new Date(row.created_at).toISOString() };
}
function agent(row: any): AgentRecord {
  return { id: row.id, identityId: row.identity_id, name: row.name, status: row.status, createdAt: new Date(row.created_at).toISOString() };
}
function randomId(prefix: string): string { return `${prefix}_${randomBytes(16).toString("hex")}`; }

export async function findIdentityById(id: string): Promise<AgentIdentity | undefined> {
  const result = await db.query("SELECT * FROM identities WHERE id = $1 LIMIT 1", [id]);
  return result.rowCount ? identity(result.rows[0]) : undefined;
}

export async function findIdentityByOwner(owner: Address): Promise<AgentIdentity | undefined> {
  const result = await db.query("SELECT * FROM identities WHERE owner_address = $1 LIMIT 1", [owner.toLowerCase()]);
  return result.rowCount ? identity(result.rows[0]) : undefined;
}

export async function upsertIdentity(owner: Address, delegatedAccount: Address): Promise<AgentIdentity> {
  const existing = await findIdentityByOwner(owner);
  if (existing) {
    if (existing.status !== "active") throw new Error("Agent identity revoked");
    if (existing.delegatedAccount.toLowerCase() !== delegatedAccount.toLowerCase()) throw new Error("Delegated account does not match AgentHub identity");
    return existing;
  }
  const id = randomId("id");
  const result = await db.query(
    "INSERT INTO identities (id, owner_address, delegated_account) VALUES ($1, $2, $3) RETURNING *",
    [id, owner.toLowerCase(), delegatedAccount.toLowerCase()],
  );
  return identity(result.rows[0]);
}

export async function findAgentById(id: string): Promise<AgentRecord | undefined> {
  const result = await db.query("SELECT * FROM agents WHERE id = $1 LIMIT 1", [id]);
  return result.rowCount ? agent(result.rows[0]) : undefined;
}

export async function createDbAgent(identityId: string, name: string): Promise<AgentRecord> {
  const id = randomId("agent");
  const result = await db.query(
    "INSERT INTO agents (id, identity_id, name) SELECT $1, id, $2 FROM identities WHERE id = $3 AND status = 'active' RETURNING *",
    [id, name.trim().slice(0, 64) || "Agent", identityId],
  );
  if (!result.rowCount) throw new Error("Agent identity is not active");
  return agent(result.rows[0]);
}

export async function insertAccessKey(params: { id: string; identityId: string; tokenHash: string; expiresAt: number }): Promise<void> {
  await db.query(
    "INSERT INTO access_keys (id, identity_id, token_hash, expires_at) VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))",
    [params.id, params.identityId, params.tokenHash, params.expiresAt],
  );
}

export async function findIdentityByAccessHash(tokenHash: string): Promise<AgentIdentity | undefined> {
  const result = await db.query(
    "SELECT i.* FROM access_keys k JOIN identities i ON i.id = k.identity_id WHERE k.token_hash = $1 AND k.revoked_at IS NULL AND k.expires_at > NOW() AND i.status = 'active' LIMIT 1",
    [tokenHash],
  );
  if (!result.rowCount) return undefined;
  await db.query("UPDATE access_keys SET last_used_at = NOW() WHERE token_hash = $1", [tokenHash]);
  return identity(result.rows[0]);
}

export async function revokeDbAccessKey(id: string, identityId: string): Promise<boolean> {
  const result = await db.query("UPDATE access_keys SET revoked_at = NOW() WHERE id = $1 AND identity_id = $2 AND revoked_at IS NULL", [id, identityId]);
  return (result.rowCount ?? 0) > 0;
}

export async function insertCredential(params: { credential: AgentCredential; connectionId: string }): Promise<void> {
  await db.query("BEGIN");
  try {
    await db.query("INSERT INTO connections (id, identity_id, agent_id, expires_at) VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))", [params.connectionId, params.credential.identityId, params.credential.agentId, params.credential.expiresAt]);
    await db.query("INSERT INTO agent_credentials (id, connection_id, agent_id, identity_id, token_hash, scopes, expires_at) VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))", [params.credential.id, params.connectionId, params.credential.agentId, params.credential.identityId, params.credential.tokenHash, params.credential.scopes, params.credential.expiresAt]);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

export async function findCredentialByHash(tokenHash: string): Promise<AgentCredential | undefined> {
  const result = await db.query("SELECT c.*, i.owner_address, i.delegated_account FROM agent_credentials c JOIN identities i ON i.id = c.identity_id JOIN agents a ON a.id = c.agent_id WHERE c.token_hash = $1 AND c.revoked_at IS NULL AND c.expires_at > NOW() AND i.status = 'active' AND a.status = 'active' AND a.identity_id = c.identity_id LIMIT 1", [tokenHash]);
  if (!result.rowCount) return undefined;
  const row = result.rows[0];
  await db.query("UPDATE agent_credentials SET last_used_at = NOW() WHERE id = $1", [row.id]);
  return { id: row.id, agentId: row.agent_id, identityId: row.identity_id, owner: row.owner_address, delegatedAccount: row.delegated_account, scopes: Object.freeze(row.scopes ?? []), expiresAt: new Date(row.expires_at).getTime(), revoked: false, tokenHash: row.token_hash };
}

export async function revokeDbCredential(id: string, identityId?: string): Promise<boolean> {
  const result = identityId
    ? await db.query("UPDATE agent_credentials SET revoked_at = NOW() WHERE id = $1 AND identity_id = $2 AND revoked_at IS NULL", [id, identityId])
    : await db.query("UPDATE agent_credentials SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL", [id]);
  return (result.rowCount ?? 0) > 0;
}
