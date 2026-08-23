import type { Address, WalletClient } from "viem";
import { encodeFunctionData } from "viem";
import { monad } from "../config.js";
const ERC20_TRANSFER_ABI = [{ type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }] as const;
export function encodeCollateralTransfer(token: Address, delegatedAccount: Address, amount: bigint) { return encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [delegatedAccount, amount] }); }
export async function submitCollateralTransfer(params: { walletClient: WalletClient; owner: Address; token: Address; delegatedAccount: Address; amount: bigint }) {
  return params.walletClient.writeContract({ chain: monad, address: params.token, abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [params.delegatedAccount, params.amount], account: params.owner });
}
