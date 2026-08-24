import { getDb } from "../db/client.js";
import { decryptSecret } from "../security/secrets.js";

async function getSecret(identityId: string, type: "api_key" | "private_key") {
  const result = await getDb().query(
    "SELECT ciphertext, iv, auth_tag, expires_at FROM connector_secrets WHERE identity_id = $1 AND connector = 'perpl' AND secret_type = $2 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1",
    [identityId, type],
  );
  if (!result.rowCount) throw new Error("Perpl credentials are not enrolled");
  return decryptSecret({ ciphertext: result.rows[0].ciphertext, iv: result.rows[0].iv, authTag: result.rows[0].auth_tag });
}

export async function loadPerplCredentials(identityId: string) {
  const apiKey = await getSecret(identityId, "api_key");
  const privateKey = Buffer.from(await getSecret(identityId, "private_key"), "base64url");
  return { apiKey, privateKey: new Uint8Array(privateKey) };
}
