import { encodeFunctionData, type Address, type WalletClient } from "viem";

const ERC20_TRANSFER_ABI = [{ type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }] as const;

export async function depositAUSD(walletClient: WalletClient, owner: Address, ausd: Address, delegatedAccount: Address, amount: bigint) {
  return walletClient.writeContract({
    address: ausd,
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [delegatedAccount, amount],
    account: owner,
  });
}

export function encodeAUSDDeposit(ausd: Address, delegatedAccount: Address, amount: bigint) {
  return encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [delegatedAccount, amount] });
}
