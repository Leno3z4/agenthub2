import type { Address, PublicClient, WalletClient } from "viem";
import { encodeFunctionData } from "viem";
import { PERPL_EXCHANGE, publicClient } from "../config.js";
import { encodeApprove, encodeCreateAccount, executeFromOwner, getPerplAccountId } from "./account.js";

export const ERC20_TRANSFER_ABI = [{ type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }] as const;

export function encodeCollateralTransfer(delegatedAccount: Address, amount: bigint) {
  return encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [delegatedAccount, amount] });
}

export async function preparePerplOnboarding(params: {
  owner: Address;
  delegatedAccount: Address;
  collateralToken: Address;
  amount: bigint;
  client?: PublicClient;
}) {
  const client = params.client ?? publicClient;
  const accountId = await getPerplAccountId(client, params.delegatedAccount, PERPL_EXCHANGE);
  if (accountId !== 0n) return { status: "ready" as const, accountId };
  return {
    status: "needs-funding" as const,
    collateralToken: params.collateralToken,
    amount: params.amount,
    approvalCalldata: encodeApprove(PERPL_EXCHANGE, params.amount),
    createAccountCalldata: encodeCreateAccount(params.amount),
  };
}

export async function executePerplAccountCreation(params: {
  walletClient: WalletClient;
  owner: Address;
  delegatedAccount: Address;
  amount: bigint;
}) {
  return executeFromOwner({
    walletClient: params.walletClient,
    owner: params.owner,
    delegatedAccount: params.delegatedAccount,
    target: PERPL_EXCHANGE,
    data: encodeCreateAccount(params.amount),
  });
}
