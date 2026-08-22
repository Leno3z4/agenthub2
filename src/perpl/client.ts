import { getAddress, type Address } from "viem";
import {
  INVAIRIANT_FACTORY,
  INVAIRIANT_IMPLEMENTATION,
  PERPL_EXCHANGE,
  publicClient,
} from "../config.js";

export function normalizeAddress(value: string): Address {
  return getAddress(value);
}

export async function getPerplExchangeCode(): Promise<`0x${string}`> {
  return publicClient.getCode({ address: PERPL_EXCHANGE }) ?? "0x";
}

export async function getInvairiantFactoryCode(): Promise<`0x${string}`> {
  return publicClient.getCode({ address: INVAIRIANT_FACTORY }) ?? "0x";
}

export async function getInvairiantImplementationCode(): Promise<`0x${string}`> {
  return publicClient.getCode({ address: INVAIRIANT_IMPLEMENTATION }) ?? "0x";
}

export async function verifyPerplDeployment() {
  const [exchangeCode, factoryCode, implementationCode] = await Promise.all([
    getPerplExchangeCode(),
    getInvairiantFactoryCode(),
    getInvairiantImplementationCode(),
  ]);

  return {
    chainId: await publicClient.getChainId(),
    exchange: PERPL_EXCHANGE,
    exchangeDeployed: exchangeCode !== "0x",
    invairiantFactory: INVAIRIANT_FACTORY,
    invairiantFactoryDeployed: factoryCode !== "0x",
    invairiantImplementation: INVAIRIANT_IMPLEMENTATION,
    invairiantImplementationDeployed: implementationCode !== "0x",
  };
}
