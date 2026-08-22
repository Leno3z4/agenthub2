import type { Address, WalletClient } from "viem";
import { createDelegatedAccount } from "../invairiant/onboarding.js";

export async function submitDelegatedAccountCreation(walletClient: WalletClient, owner: Address) {
  const hash = await createDelegatedAccount(walletClient, owner);
  return { hash };
}
