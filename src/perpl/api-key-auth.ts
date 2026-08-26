import { createHash, randomBytes } from "node:crypto";
import * as ed from "@noble/ed25519";

const API_URL = process.env.PERPL_API_URL ?? "https://app.perpl.xyz/api";
const CHAIN_ID = Number(process.env.PERPL_CHAIN_ID ?? 143);

export function normalizePerplPrivateKey(value: string): Uint8Array {
  const hex = value.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Perpl private key must be a 32-byte hex value");
  }
  return new Uint8Array(Buffer.from(hex, "hex"));
}

export async function signedPerplRequest(
  privateKey: Uint8Array,
  apiKey: string,
  method: string,
  target: string,
  body = "",
): Promise<Response> {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("base64url");
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const canonical = [CHAIN_ID, method.toUpperCase(), target, timestamp, nonce, bodyHash].join("\n");
  const signature = await ed.signAsync(Buffer.from(canonical), privateKey);

  return fetch(`${API_URL}${target}`, {
    method: method.toUpperCase(),
    headers: {
      "X-API-Key": apiKey.trim(),
      "X-API-Timestamp": timestamp,
      "X-API-Nonce": nonce,
      "X-API-Signature": Buffer.from(signature).toString("base64url"),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body } : {}),
  });
}

export async function verifyPerplApiKey(privateKey: Uint8Array, apiKey: string): Promise<void> {
  if (!apiKey.trim()) throw new Error("Perpl API key is required");
  const response = await signedPerplRequest(privateKey, apiKey, "GET", "/v1/trading/account-history?count=1");
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Perpl API key verification ${response.status}: ${details || response.statusText}`);
  }
}

export function isApiKeyLike(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 8 && trimmed.length <= 512 && !/\s/.test(trimmed);
}
