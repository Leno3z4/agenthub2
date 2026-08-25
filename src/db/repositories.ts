import { randomBytes } from "node:crypto";
import type { AgentCredential } from "../agent/auth.js";
import type { AgentIdentity, AgentRecord } from "../agent/identity.js";
import { getDb } from "./client.js";
import type { Address } from "viem";

function identity(row: any): AgentIdentity {
  return {
    id: row.id,
    owner: row.owner_address,
    delegatedAccount: row.delegated_account,
    status: row.status,
    killSwitchEnabled: Boolean(row.kill_switch_enabled),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function agent(row: any): AgentRecord {
  return {
    id: row.id,
    identityId: row.identity_id,
    name: row.name,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

const randomId = (prefix: string) => `${prefix}_${randomBytes(16).toString("hex")}`;

export async function findIdentityById(id: string) {
  const result = await getDb().query(
    "SELECT * FROM identities WHERE id = $1 LIMIT 1",
    [id],
  );
  return result.rowCount ? identity(result.rows[0]) : undefined;
}

export async function findIdentityByOwner(owner: Address) {
  const result = await getDb().query(
    "SELECT * FROM identities WHERE owner_address = $1 LIMIT 1",
    [owner.toLowerCase()],
  );
  return result.rowCount ? identity(result.rows[0]) : undefined;
}

export async function upsertIdentity(
  owner: Address,
  delegatedAccount: Address,
): Promise<AgentIdentity> {
  const existing = await findIdentityByOwner(owner);
  if (existing) {
    if (existing.status !== "active") throw new Error("Agent identity revoked");
    if (existing.delegatedAccount.toLowerCase() !== delegatedAccount.toLowerCase()) {
      throw new Error("Delegated account does not match AgentHub identity");
    }
    return existing;
  }

  const result = await getDb().query(
    "INSERT INTO identities (id, owner_address, delegated_account) VALUES ($1, $2, $3) ON CONFLICT (owner_address) DO UPDATE SET updated_at = NOW() RETURNING *",
    [randomId("id"), owner.toLowerCase(), delegatedAccount.toLowerCase()],
  );
  return identity(result.rows[0]);
}

export async function setIdentityKillSwitch(
  identityId: string,
  enabled: boolean,
): Promise<AgentIdentity> {
  const result = await getDb().query(
    "UPDATE identities SET kill_switch_enabled = $2, updated_at = NOW() WHERE id = $1 AND status = 'active' RETURNING *",
    [identityId, enabled],
  );
  if (!result.rowCount) throw new Error("Agent identity is not active");
  return identity(result.rows[0]);
}

export async function findAgentById(id: string) {
  const result = await getDb().query(
    "SELECT * FROM agents WHERE id = $1 LIMIT 1",
    [id],
  );
  return result.rowCount ? agent(result.rows[0]) : undefined;
}

export async function createDbAgent(
  identityId: string,
  name: string,
): Promise<AgentRecord> {
  const result = await getDb().query(
    "INSERT INTO agents (id, identity_id, name) SELECT $1, id, $2 FROM identities WHERE id = $3 AND status = 'active' RETURNING *",
    [randomId("agent"), name.trim().slice(0, 64) || "Agent", identityId],
  );
  if (!result.rowCount) throw new Error("Agent identity is not active");
  return agent(result.rows[0]);
}

export async function findAgentsByIdentity(identityId: string) {
  const result = await getDb().query(
    `SELECT
       a.id,
       a.name,
       a.status,
       a.created_at,
       c.id AS connection_id,
       c.connector,
       c.status AS connection_status,
       c.expires_at,
       c.capabilities,
       last_used.last_used_at
     FROM agents a
     LEFT JOIN LATERAL (
       SELECT id, connector, status, expires_at, capabilities
       FROM connections
       WHERE agent_id = a.id
       ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
       LIMIT 1
     ) c ON true
     LEFT JOIN LATERAL (
       SELECT MAX(last_used_at) AS last_used_at
       FROM agent_credentials
       WHERE agent_id = a.id
     ) last_used ON true
     WHERE a.identity_id = $1
     ORDER BY a.created_at DESC`,
    [identityId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    connector: row.connector ?? null,
    connectionId: row.connection_id ?? null,
    connectionStatus: row.connection_status ?? null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
    createdAt: new Date(row.created_at).toISOString(),
    lastActive: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
  }));
}

export async function revokeDbAgent(id: string, identityId: string) {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");

    const agentResult = await client.query(
      "UPDATE agents SET status = 'revoked', updated_at = NOW() WHERE id = $1 AND identity_id = $2 AND status = 'active' RETURNING id",
      [id, identityId],
    );
    if (!agentResult.rowCount) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      "UPDATE connections SET status = 'revoked', revoked_at = NOW() WHERE agent_id = $1 AND identity_id = $2 AND status = 'active'",
      [id, identityId],
    );
    await client.query(
      "UPDATE agent_credentials SET revoked_at = NOW() WHERE agent_id = $1 AND identity_id = $2 AND revoked_at IS NULL",
      [id, identityId],
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function insertAccessKey(params: {
  id: string;
  identityId: string;
  tokenHash: string;
  expiresAt: number;
}) {
  await getDb().query(
    "INSERT INTO access_keys (id, identity_id, token_hash, expires_at) VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))",
    [params.id, params.identityId, params.tokenHash, params.expiresAt],
  );
}

export async function findIdentityByAccessHash(tokenHash: string) {
  const result = await getDb().query(
    "SELECT i.* FROM access_keys k JOIN identities i ON i.id = k.identity_id WHERE k.token_hash = $1 AND k.revoked_at IS NULL AND k.expires_at > NOW() AND i.status = 'active' LIMIT 1",
    [tokenHash],
  );
  if (!result.rowCount) return undefined;
  await getDb().query(
    "UPDATE access_keys SET last_used_at = NOW() WHERE token_hash = $1",
    [tokenHash],
  );
  return identity(result.rows[0]);
}

export async function revokeDbAccessKey(id: string, identityId: string) {
  const result = await getDb().query(
    "UPDATE access_keys SET revoked_at = NOW() WHERE id = $1 AND identity_id = $2 AND revoked_at IS NULL",
    [id, identityId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function insertCredential(params: {
  credential: AgentCredential;
  connectionId: string;
  connector: string;
  capabilities: readonly string[];
}) {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO connections (id, identity_id, agent_id, connector, capabilities, expires_at) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))",
      [
        params.connectionId,
        params.credential.identityId,
        params.credential.agentId,
        params.connector,
        params.capabilities,
        params.credential.expiresAt,
      ],
    );
    await client.query(
      "INSERT INTO agent_credentials (id, connection_id, agent_id, identity_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))",
      [
        params.credential.id,
        params.connectionId,
        params.credential.agentId,
        params.credential.identityId,
        params.credential.tokenHash,
        params.credential.expiresAt,
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findCredentialByHash(
  tokenHash: string,
): Promise<AgentCredential | undefined> {
  const result = await getDb().query(
    "SELECT c.*, i.owner_address, i.delegated_account, i.kill_switch_enabled, x.connector, x.status AS connection_status, x.capabilities FROM agent_credentials c JOIN identities i ON i.id = c.identity_id JOIN agents a ON a.id = c.agent_id JOIN connections x ON x.id = c.connection_id WHERE c.token_hash = $1 AND c.revoked_at IS NULL AND c.expires_at > NOW() AND x.status = 'active' AND i.status = 'active' AND a.status = 'active' AND a.identity_id = c.identity_id LIMIT 1",
    [tokenHash],
  );
  if (!result.rowCount) return undefined;

  const row = result.rows[0];
  await getDb().query(
    "UPDATE agent_credentials SET last_used_at = NOW() WHERE id = $1",
    [row.id],
  );

  return {
    id: row.id,
    agentId: row.agent_id,
    identityId: row.identity_id,
    connectionId: row.connection_id,
    owner: row.owner_address,
    delegatedAccount: row.delegated_account,
    scopes: Object.freeze(Array.isArray(row.capabilities) ? row.capabilities : []),
    killSwitchEnabled: Boolean(row.kill_switch_enabled),
    expiresAt: new Date(row.expires_at).getTime(),
    revoked: false,
    tokenHash: row.token_hash,
    connector: row.connector,
  };
}

export async function revokeDbCredential(id: string, identityId?: string) {
  const result = identityId
    ? await getDb().query(
        "UPDATE agent_credentials SET revoked_at = NOW() WHERE id = $1 AND identity_id = $2 AND revoked_at IS NULL",
        [id, identityId],
      )
    : await getDb().query(
        "UPDATE agent_credentials SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL",
        [id],
      );
  return (result.rowCount ?? 0) > 0;
}

export async function insertIdentityChallenge(params: {
  nonce: string;
  owner: Address;
  message: string;
  expiresAt: number;
}) {
  await getDb().query(
    "INSERT INTO identity_challenges (nonce, owner_address, message, expires_at) VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))",
    [params.nonce, params.owner.toLowerCase(), params.message, params.expiresAt],
  );
}

export async function consumeIdentityChallenge(
  nonce: string,
  owner: Address,
  message: string,
) {
  const result = await getDb().query(
    "UPDATE identity_challenges SET used_at = NOW() WHERE nonce = $1 AND owner_address = $2 AND message = $3 AND used_at IS NULL AND expires_at > NOW() RETURNING nonce",
    [nonce, owner.toLowerCase(), message],
  );
  return Boolean(result.rowCount);
}
