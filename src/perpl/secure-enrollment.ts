import { randomBytes } from "node:crypto";
import * as ed from "@noble/ed25519";
import type { Address, Hex } from "viem";
import { hashTypedData } from "viem";
import { encryptSecret } from "../security/secrets.js";
import { requestEnrollmentPayload, enrollApiKey } from "./enrollment.js";

const TTL_MS = 5 * 60_000;

export interface PendingPerplEnrollment {
  id: string;
  identityId: string;
  delegatedAccount: Address;
  publicKey: Hex;
  privateKey: Uint8Array;
  expiresAt: number;
}

export async function beginPerplEnrollment(params: {
  identityId: string;
  delegatedAccount: Address;
  label: string;
  origin: string;
}): Promise<PendingPerplEnrollment & { payload: Awaited<ReturnType<typeof requestEnrollmentPayload>> }> {
  const privateKey = randomBytes(32);
  const publicKey = `0x${Buffer.from(await ed.getPublicKeyAsync(privateKey)).toString("hex")}` as Hex;
  const payload = await requestEnrollmentPayload({
    address: params.delegatedAccount,
    publicKey,
    label: params.label.slice(0, 64),
    origin: params.origin,
  });
  return {
    id: `pen_${randomBytes(16).toString("hex")}`,
    identityId: params.identityId,
    delegatedAccount: params.delegatedAccount,
    publicKey,
    privateKey,
    expiresAt: Date.now() + TTL_MS,
    payload,
  };
}

export async function finishPerplEnrollment(params: {
  pending: PendingPerplEnrollment;
  payload: Awaited<ReturnType<typeof requestEnrollmentPayload>>;
  walletSignature: Hex;
  origin: string;
}): Promise<{ apiKey: string; encryptedPrivateKey: ReturnType<typeof encryptSecret>; publicKey: Hex }> {
  if (Date.now() >= params.pending.expiresAt) throw new Error("Perpl enrollment expired");
  if (params.pending.publicKey.toLowerCase() !== String(params.payload.typed_data.message.public_key ?? "").toLowerCase()) throw new Error("Perpl enrollment key mismatch");
  const apiKey = await enrollApiKey({
    address: params.pending.delegatedAccount,
    payload: params.payload,
    walletSignature: params.walletSignature,
    privateKey: params.pending.privateKey,
    origin: params.origin,
  });
  return { apiKey: apiKey.api_key, encryptedPrivateKey: encryptSecret(Buffer.from(params.pending.privateKey).toString("base64url")), publicKey: params.pending.publicKey };
}

export function proofDigest(payload: Awaited<ReturnType<typeof requestEnrollmentPayload>>): Hex {
  return hashTypedData(payload.typed_data);
}
