import { randomBytes } from "node:crypto";
import type { Address, Hex } from "viem";
import { getDb } from "../db/client.js";
import { decryptSecret, encryptSecret } from "../security/secrets.js";

export async function savePendingEnrollment(input: { id: string; identityId: string; delegatedAccount: Address; publicKey: Hex; privateKey: Uint8Array; typedData: unknown; mac: string; expiresAt: number }) {
  const encrypted = encryptSecret(Buffer.from(input.privateKey).toString("base64url"));
  await getDb().query("INSERT INTO perpl_enrollments (id, identity_id, delegated_account, public_key, encrypted_private_key, private_key_iv, private_key_auth_tag, typed_data, mac, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,to_timestamp($10 / 1000.0))", [input.id, input.identityId, input.delegatedAccount.toLowerCase(), input.publicKey, encrypted.ciphertext, encrypted.iv, encrypted.authTag, JSON.stringify(input.typedData), input.mac, input.expiresAt]);
}

export async function claimPendingEnrollment(id: string, identityId: string) {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE perpl_enrollments SET processing_at = NOW() WHERE id = $1 AND identity_id = $2 AND processing_at IS NULL AND consumed_at IS NULL AND expires_at > NOW() RETURNING *", [id, identityId]);
    if (!result.rowCount) { await client.query("ROLLBACK"); return undefined; }
    const row = result.rows[0];
    await client.query("COMMIT");
    const privateKey = Buffer.from(decryptSecret({ ciphertext: row.encrypted_private_key, iv: row.private_key_iv, authTag: row.private_key_auth_tag }), "base64url");
    return { id: row.id, identityId: row.identity_id, delegatedAccount: row.delegated_account as Address, publicKey: row.public_key as Hex, privateKey, typedData: row.typed_data, mac: row.mac, expiresAt: new Date(row.expires_at).getTime() };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function finishClaimedEnrollment(id: string, identityId: string) {
  const result = await getDb().query("UPDATE perpl_enrollments SET consumed_at = NOW() WHERE id = $1 AND identity_id = $2 AND processing_at IS NOT NULL AND consumed_at IS NULL AND expires_at > NOW()", [id, identityId]);
  return (result.rowCount ?? 0) > 0;
}

export async function releaseClaimedEnrollment(id: string, identityId: string) {
  await getDb().query("UPDATE perpl_enrollments SET processing_at = NULL WHERE id = $1 AND identity_id = $2 AND consumed_at IS NULL", [id, identityId]);
}

export async function savePerplSecret(input: { identityId: string; connectionId?: string; apiKey: string; privateKey: Uint8Array; expiresAt?: number }) {
  const api = encryptSecret(input.apiKey);
  const key = encryptSecret(Buffer.from(input.privateKey).toString("base64url"));
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM connector_secrets WHERE identity_id = $1 AND connector = 'perpl' AND secret_type IN ('api_key','private_key') AND revoked_at IS NULL", [input.identityId]);
    await client.query("INSERT INTO connector_secrets (id, identity_id, connection_id, connector, secret_type, ciphertext, iv, auth_tag, expires_at) VALUES ($1,$2,$3,'perpl','api_key',$4,$5,$6,to_timestamp($7 / 1000.0))", [`sec_${randomBytes(16).toString("hex")}`, input.identityId, input.connectionId ?? null, api.ciphertext, api.iv, api.authTag, input.expiresAt ?? null]);
    await client.query("INSERT INTO connector_secrets (id, identity_id, connection_id, connector, secret_type, ciphertext, iv, auth_tag, expires_at) VALUES ($1,$2,$3,'perpl','private_key',$4,$5,$6,to_timestamp($7 / 1000.0))", [`sec_${randomBytes(16).toString("hex")}`, input.identityId, input.connectionId ?? null, api.ciphertext, key.iv, key.authTag, input.expiresAt ?? null]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
