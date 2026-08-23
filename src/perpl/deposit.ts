import { encodeFunctionData, type Address, type PublicClient, type WalletClient } from "viem";
import { PERPL_EXCHANGE, monad } from "../config.js";
export const ERC20_TRANSFER_ABI = [
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;
export function encodeTokenTransfer(to: Address, amount: bigint) { return encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [to, amount] }); }
export function encodeTokenApprove(spender: Address, amount: bigint) { return encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "approve", args: [spender, amount] }); }
export async function getTokenBalance(publicClient: PublicClient, token: Address, account: Address) { return publicClient.readContract({ address: token, abi: ERC20_TRANSFER_ABI, functionName: "balanceOf", args: [account] }); }
export async function getTokenAllowance(publicClient: PublicClient, token: Address, owner: Address, spender: Address = PERPL_EXCHANGE) { return publicClient.readContract({ address: token, abi: ERC20_TRANSFER_ABI, functionName: "allowance", args: [owner, spender] }); }
export async function depositTokenToDelegatedAccount(params: { walletClient: WalletClient; owner: Address; token: Address; delegatedAccount: Address; amount: bigint }) {
  return params.walletClient.writeContract({ chain: monad, address: params.token, abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [params.delegatedAccount, params.amount], account: params.owner });
}
