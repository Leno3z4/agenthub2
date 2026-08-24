import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const value = process.env.CONNECTOR_SECRET_KEY;
  if (!value) throw new Error("CONNECTOR_SECRET_KEY is required");
  const buffer = Buffer.from(value, "base64url");
  if (buffer.length !== 32) throw new Error("CONNECTOR_SECRET_KEY must decode to 32 bytes");
  return buffer;
}

export interface EncryptedSecret {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export function encryptSecret(value: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptSecret(secret: EncryptedSecret): string {
  const decipher = createDecipheriv("aes-256-gcm", key(), secret.iv);
  decipher.setAuthTag(secret.authTag);
  return Buffer.concat([decipher.update(secret.ciphertext), decipher.final()]).toString("utf8");
}
