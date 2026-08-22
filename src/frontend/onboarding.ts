import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { parseUnits } from "viem";
import { buildPerplOnboardingPlan, submitCollateralTransfer, submitOwnerDelegatedCall, verifyPerplAccount } from "../perpl/frontend-onboarding.js";

export type OnboardingStep = "fund" | "create-account" | "verify" | "ready";

export interface OnboardingState {
  step: OnboardingStep;
  delegatedAccount: Address;
  amount: bigint;
  txHash?: Hex;
  accountId?: bigint;
}

export async function fundDelegatedAccount(params: {
  walletClient: WalletClient;
  owner: Address;
  token: Address;
  delegatedAccount: Address;
  amount: string;
  decimals: number;
}) {
  const value = parseUnits(params.amount, params.decimals);
  if (value <= 0n) throw new Error("Collateral amount must be positive");
  return submitCollateralTransfer({
    walletClient: params.walletClient,
    owner: params.owner,
    token: params.token,
    delegatedAccount: params.delegatedAccount,
    amount: value,
  });
}

export async function createPerplAccountFromWallet(params: {
  walletClient: WalletClient;
  owner: Address;
  delegatedAccount: Address;
  exchange: Address;
  amount: bigint;
}) {
  const plan = buildPerplOnboardingPlan({
    collateralToken: params.token,
    exchange: params.exchange,
    delegatedAccount: params.delegatedAccount,
    amountDisplay: "0",
    decimals: 0,
  });
  return submitOwnerDelegatedCall({
    walletClient: params.walletClient,
    owner: params.owner,
    delegatedAccount: params.delegatedAccount,
    target: params.exchange,
    data: plan.createAccountCalldata,
  });
}

export async function waitForPerplAccount(params: {
  publicClient: PublicClient;
  exchange: Address;
  delegatedAccount: Address;
  timeoutMs?: number;
  pollMs?: number;
}) {
  const timeout = params.timeoutMs ?? 120_000;
  const poll = params.pollMs ?? 2_000;
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const result = await verifyPerplAccount({ publicClient: params.publicClient, exchange: params.exchange, delegatedAccount: params.delegatedAccount });
    if (result.ready) return result;
    await new Promise((resolve) => setTimeout(resolve, poll));
  }
  throw new Error("Timed out waiting for Perpl account creation");
}
