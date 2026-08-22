import type { Address, PublicClient, WalletClient } from "viem";
import { encodeFunctionData, zeroAddress } from "viem";
import { PERPL_API_URL, PERPL_EXCHANGE } from "../perpl/config.js";
import { accountAbi } from "../invairiant/abi.js";

const erc20Abi = [{ type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }] as const;
const exchangeAbi = [
  { type: "function", name: "getAccountByAddr", stateMutability: "view", inputs: [{ name: "addr", type: "address" }], outputs: [{ name: "accountId", type: "uint256" }] },
  { type: "function", name: "createAccount", stateMutability: "nonpayable", inputs: [{ name: "amountCNS", type: "uint256" }], outputs: [{ name: "accountId", type: "uint256" }] },
] as const;

export interface PerplAccountCreationInfo {
  smartContractAddress: Address;
  collateralTokenAddress: Address;
  collateralTokenSymbol: string;
  collateralDecimals: number;
  minimumDeposit: bigint;
}

export async function getAccountCreationInfo(): Promise<PerplAccountCreationInfo> {
  const response = await fetch(`${PERPL_API_URL}/v1/pub/context`);
  if (!response.ok) throw new Error(`Perpl context request failed: ${response.status}`);
  const context = await response.json() as any;
  const instance = context.instances?.[0];
  if (!instance) throw new Error("Perpl returned no exchange instance");
  const token = context.tokens?.find((x: any) => x.id === instance.collateral_token_id);
  if (!token) throw new Error("Perpl collateral token not found");
  return {
    smartContractAddress: instance.address as Address,
    collateralTokenAddress: token.address as Address,
    collateralTokenSymbol: token.symbol,
    collateralDecimals: Number(token.decimals),
    minimumDeposit: BigInt(instance.min_account_open_amount),
  };
}

export async function getPerplAccountId(publicClient: PublicClient, delegatedAccount: Address, exchange: Address = PERPL_EXCHANGE) {
  return publicClient.readContract({ address: exchange, abi: exchangeAbi, functionName: "getAccountByAddr", args: [delegatedAccount] });
}

export function encodeCollateralApproval(exchange: Address, amount: bigint) {
  return encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [exchange, amount] });
}

export function encodePerplCreateAccount(amountCNS: bigint) {
  return encodeFunctionData({ abi: exchangeAbi, functionName: "createAccount", args: [amountCNS] });
}

export function encodeDelegatedExecute(target: Address, data: `0x${string}`) {
  return encodeFunctionData({ abi: accountAbi, functionName: "execute", args: [target, data] });
}

export async function createPerplAccountFromDelegatedAccount(params: {
  walletClient: WalletClient;
  owner: Address;
  delegatedAccount: Address;
  collateralToken: Address;
  exchange?: Address;
  amountCNS: bigint;
}) {
  const exchange = params.exchange ?? PERPL_EXCHANGE;
  if (params.delegatedAccount === zeroAddress) throw new Error("Delegated account is not initialized");
  const approveData = encodeCollateralApproval(exchange, params.amountCNS);
  const approveTx = await params.walletClient.writeContract({
    address: params.delegatedAccount,
    abi: accountAbi,
    functionName: "setApproval",
    args: [params.collateralToken, exchange, params.amountCNS],
    account: params.owner,
  });
  const createData = encodePerplCreateAccount(params.amountCNS);
  return { approveTx, createData, createExecuteData: encodeDelegatedExecute(exchange, createData), approveData };
}
