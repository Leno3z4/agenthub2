import { getAddress, type Address } from "viem";
import { INVAIRIANT_FACTORY, INVAIRIANT_IMPLEMENTATION, PERPL_EXCHANGE, publicClient } from "../config.js";

export function normalizeAddress(value: string): Address { return getAddress(value); }

async function codeAt(address: Address): Promise<`0x${string}`> {
  return (await publicClient.getCode({ address })) ?? "0x";
}

export async function getPerplExchangeCode() { return codeAt(PERPL_EXCHANGE); }
export async function getInvairiantFactoryCode() { return codeAt(INVAIRIANT_FACTORY); }
export async function getInvairiantImplementationCode() { return codeAt(INVAIRIANT_IMPLEMENTATION); }

export async function verifyPerplDeployment() {
  const [exchangeCode, factoryCode, implementationCode] = await Promise.all([getPerplExchangeCode(), getInvairiantFactoryCode(), getInvairiantImplementationCode()]);
  return { chainId: await publicClient.getChainId(), exchange: PERPL_EXCHANGE, exchangeDeployed: exchangeCode !== "0x", invairiantFactory: INVAIRIANT_FACTORY, invairiantFactoryDeployed: factoryCode !== "0x", invairiantImplementation: INVAIRIANT_IMPLEMENTATION, invairiantImplementationDeployed: implementationCode !== "0x" };
}
