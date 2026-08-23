import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { encodeFunctionData, type Address, type WalletClient } from "viem";
import { INVAIRIANT_FACTORY, monad } from "../config.js";
import { factoryAbi } from "./abi.js";
export function createAgentOperator() { const privateKey = generatePrivateKey(); return { privateKey, account: privateKeyToAccount(privateKey) }; }
export async function getDelegatedAccount(owner: Address, publicClient: any) { return publicClient.readContract({ address: INVAIRIANT_FACTORY, abi: factoryAbi, functionName: "getAccount", args: [owner] }); }
export async function createDelegatedAccount(walletClient: WalletClient, owner: Address, operator: Address = owner) {
  const [account] = await walletClient.getAddresses(); if (account.toLowerCase() !== owner.toLowerCase()) throw new Error("Connected wallet does not match owner");
  return walletClient.writeContract({ chain: monad, address: INVAIRIANT_FACTORY, abi: factoryAbi, functionName: "createAccount", args: [operator], account: owner });
}
export function encodeDelegatedExecution(target: Address, data: `0x${string}`, value: bigint = 0n) { return encodeFunctionData({ abi: [{ type: "function", name: "execute", stateMutability: "payable", inputs: [{ name: "target", type: "address" }, { name: "value", type: "uint256" }, { name: "data", type: "bytes" }], outputs: [{ type: "bytes" }] }] as const, functionName: "execute", args: [target, value, data] }); }
