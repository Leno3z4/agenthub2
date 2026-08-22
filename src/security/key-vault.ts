import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const VERSION = "v1";

function keyFromSecret(secret: string): Buffer {
  return scryptSync(secret, "alias-agenthub2-v1", 32);
}

export function encryptSecret(plaintext: string, masterSecret: string): string {
  if (!masterSecret) throw new Error("KEY_ENCRYPTION_SECRET is required");
  const iv = randomBytes(12);
  const key = keyFromSecret(masterSecret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, masterSecret: string): string {
  const [version, iv64, tag64, ciphertext64] = payload.split(".");
  if (version !== VERSION || !iv64 || !tag64 || !ciphertext64) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(masterSecret), Buffer.from(iv64, "base64url"));
  decipher.setAuthTag(Buffer.from(tag64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext64, "base64url")), decipher.final()]).toString("utf8");
}
