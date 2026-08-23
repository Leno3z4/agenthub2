import type { Address, PublicClient, WalletClient, Hex } from "viem";
import { encodeFunctionData, parseUnits } from "viem";
import { monad } from "../config.js";
import { ERC20_ABI, PERPL_EXCHANGE_ABI, DELEGATED_ACCOUNT_ABI } from "./account.js";
export interface PerplOnboardingPlan { collateralToken: Address; exchange: Address; amount: bigint; approveCalldata: Hex; createAccountCalldata: Hex; }
export async function buildPerplOnboardingPlan(params: { publicClient: PublicClient; collateralToken: Address; exchange: Address; delegatedAccount: Address; amountDisplay: string; decimals: number }): Promise<PerplOnboardingPlan> {
  const amount = parseUnits(params.amountDisplay, params.decimals); if (amount <= 0n) throw new Error("Collateral amount must be positive");
  return { collateralToken: params.collateralToken, exchange: params.exchange, amount, approveCalldata: encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [params.exchange, amount] }), createAccountCalldata: encodeFunctionData({ abi: PERPL_EXCHANGE_ABI, functionName: "createAccount", args: [amount] }) };
}
export function encodeDelegatedCall(target: Address, data: Hex): Hex { return encodeFunctionData({ abi: DELEGATED_ACCOUNT_ABI, functionName: "execute", args: [target, data] }); }
export async function submitOwnerDelegatedCall(params: { walletClient: WalletClient; owner: Address; delegatedAccount: Address; target: Address; data: Hex }) {
  return params.walletClient.writeContract({ chain: monad, address: params.delegatedAccount, abi: DELEGATED_ACCOUNT_ABI, functionName: "execute", args: [params.target, params.data], account: params.owner });
}
export async function verifyPerplAccount(params: { publicClient: PublicClient; exchange: Address; delegatedAccount: Address }) {
  const accountId = await params.publicClient.readContract({ address: params.exchange, abi: PERPL_EXCHANGE_ABI, functionName: "getAccountByAddr", args: [params.delegatedAccount] });
  return { accountId, ready: accountId > 0n };
}
