import { getAddress, type Address } from "viem";
import { PERPL_EXCHANGE, PERPL_DELEGATED_ACCOUNT_FACTORY, publicClient } from "../config.js";

export function normalizeAddress(value: string): Address {
  return getAddress(value);
}

export async function getPerplExchangeCode(): Promise<`0x${string}`> {
  return publicClient.getCode({ address: PERPL_EXCHANGE }) ?? "0x";
}

export async function getDelegatedAccountFactoryCode(): Promise<`0x${string}`> {
  return publicClient.getCode({ address: PERPL_DELEGATED_ACCOUNT_FACTORY }) ?? "0x";
}

export async function verifyPerplDeployment() {
  const [exchangeCode, factoryCode] = await Promise.all([
    getPerplExchangeCode(),
    getDelegatedAccountFactoryCode(),
  ]);

  return {
    chainId: await publicClient.getChainId(),
    exchange: PERPL_EXCHANGE,
    exchangeDeployed: exchangeCode !== "0x",
    delegatedAccountFactory: PERPL_DELEGATED_ACCOUNT_FACTORY,
    delegatedAccountFactoryDeployed: factoryCode !== "0x",
  };
}
