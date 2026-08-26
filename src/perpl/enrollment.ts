import { randomBytes } from "node:crypto";
import * as ed from "@noble/ed25519";
import { hashTypedData, type Address, type Hex } from "viem";

const API_URL = process.env.PERPL_API_URL ?? "https://app.perpl.xyz/api";
const CHAIN_ID = Number(process.env.PERPL_CHAIN_ID ?? 143);

export interface PerplApiKeyMaterial {
  privateKey: Uint8Array;
  publicKey: Hex;
}

export interface PerplPayloadResponse {
  typed_data: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };
  mac: string;
}

export async function generateApiKeyMaterial(): Promise<PerplApiKeyMaterial> {
  const privateKey = randomBytes(32);
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return {
    privateKey,
    publicKey: `0x${Buffer.from(publicKey).toString("hex")}` as Hex,
  };
}

export async function requestEnrollmentPayload(params: {
  address: Address;
  publicKey: Hex;
  label: string;
  scopeMask?: 1 | 2 | 3;
  targetProfile?: Address;
  origin: string;
}): Promise<PerplPayloadResponse> {
  // target_profile must be included in the payload request for delegated
  // accounts. Perpl freezes the target profile into the EIP-712 payload, so
  // omitting it here makes the wallet sign the wrong enrollment.
  const response = await fetch(`${API_URL}/v1/api-key/payload`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: params.origin,
    },
    body: JSON.stringify({
      chain_id: CHAIN_ID,
      address: params.address,
      public_key: params.publicKey,
      scope_mask: params.scopeMask ?? 3,
      label: params.label,
      ...(params.targetProfile ? { target_profile: params.targetProfile } : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Perpl enrollment payload ${response.status}: ${details || response.statusText}`);
  }

  return response.json() as Promise<PerplPayloadResponse>;
}

export function getApiKeyProofDigest(payload: PerplPayloadResponse["typed_data"]): Hex {
  // EIP-712 domain metadata is implicit in hashTypedData and must not be
  // included as a user-defined type. Perpl's payload can contain EIP712Domain
  // alongside the actual signing types.
  const { EIP712Domain: _ignored, ...types } = payload.types;
  return hashTypedData({
    domain: payload.domain,
    types,
    primaryType: payload.primaryType,
    message: payload.message,
  } as any);
}

export async function enrollApiKey(params: {
  address: Address;
  payload: PerplPayloadResponse;
  walletSignature: Hex;
  privateKey: Uint8Array;
  origin: string;
  targetProfile?: Address;
}): Promise<{ api_key: string }> {
  const digest = getApiKeyProofDigest(params.payload.typed_data);
  const pop = await ed.signAsync(Buffer.from(digest.slice(2), "hex"), params.privateKey);

  const response = await fetch(`${API_URL}/v1/api-key/enroll`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: params.origin,
    },
    body: JSON.stringify({
      chain_id: CHAIN_ID,
      address: params.address,
      typed_data: params.payload.typed_data,
      mac: params.payload.mac,
      signature: params.walletSignature,
      pop_signature: `0x${Buffer.from(pop).toString("hex")}`,
      ...(params.targetProfile ? { target_profile: params.targetProfile } : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Perpl API-key enrollment ${response.status}: ${details || response.statusText}`);
  }

  const result = await response.json() as { api_key: { api_key: string } };
  return { api_key: result.api_key.api_key };
}
