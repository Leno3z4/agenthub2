import type { Address, PublicClient } from "viem";
import { getDelegatedAccount } from "../invairiant/onboarding.js";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export async function checkDelegatedAccount(owner: Address, publicClient: PublicClient) {
  const account = await getDelegatedAccount(owner, publicClient) as Address;
  return { exists: account.toLowerCase() !== ZERO.toLowerCase(), address: account };
}
