import type { Address, PublicClient, WalletClient } from "viem";
import { encodeFunctionData } from "viem";

export const PERPL_EXCHANGE_ABI = [
  { type: "function", name: "getAccountByAddr", stateMutability: "view", inputs: [{ name: "addr", type: "address" }], outputs: [{ name: "accountId", type: "uint256" }] },
  { type: "function", name: "createAccount", stateMutability: "nonpayable", inputs: [{ name: "amountCNS", type: "uint256" }], outputs: [{ name: "accountId", type: "uint256" }] },
] as const;

export const ERC20_ABI = [
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const DELEGATED_ACCOUNT_ABI = [
  { type: "function", name: "execute", stateMutability: "nonpayable", inputs: [{ name: "target", type: "address" }, { name: "data", type: "bytes" }], outputs: [{ type: "bytes" }] },
] as const;

export async function getPerplAccountId(publicClient: PublicClient, account: Address, exchange: Address) {
  return publicClient.readContract({ address: exchange, abi: PERPL_EXCHANGE_ABI, functionName: "getAccountByAddr", args: [account] });
}

export function encodeApprove(exchange: Address, amount: bigint) {
  return encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [exchange, amount] });
}

export function encodeCreateAccount(amountCNS: bigint) {
  return encodeFunctionData({ abi: PERPL_EXCHANGE_ABI, functionName: "createAccount", args: [amountCNS] });
}

export function encodeDelegatedExecute(target: Address, data: `0x${string}`) {
  return encodeFunctionData({ abi: DELEGATED_ACCOUNT_ABI, functionName: "execute", args: [target, data] });
}

export function encodeApproveThroughDelegatedAccount(exchange: Address, amountCNS: bigint) {
  return encodeDelegatedExecute(exchange, encodeApprove(exchange, amountCNS));
}

export function encodeCreateAccountThroughDelegatedAccount(exchange: Address, amountCNS: bigint) {
  return encodeDelegatedExecute(exchange, encodeCreateAccount(amountCNS));
}

/** Owner submits an owner-authorized execute call; the operator is not involved. */
export async function executeFromOwner(params: {
  walletClient: WalletClient;
  owner: Address;
  delegatedAccount: Address;
  target: Address;
  data: `0x${string}`;
}) {
  return params.walletClient.writeContract({
    address: params.delegatedAccount,
    abi: DELEGATED_ACCOUNT_ABI,
    functionName: "execute",
    args: [params.target, params.data],
    account: params.owner,
  });
}

export async function createPerplAccountDirect(params: { walletClient: WalletClient; owner: Address; exchange: Address; amountCNS: bigint }) {
  return params.walletClient.writeContract({ address: params.exchange, abi: PERPL_EXCHANGE_ABI, functionName: "createAccount", args: [params.amountCNS], account: params.owner });
}
