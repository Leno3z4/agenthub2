import { createPublicClient, http, type Address, defineChain } from "viem";

export const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_RPC_URL ?? "https://rpc.monad.xyz"] } },
});

export const PERPL_EXCHANGE: Address = "0x34B6552d57a35a1D042CcAe1951BD1C370112a6F";
export const PERPL_DELEGATED_ACCOUNT_FACTORY: Address = "0xc535276e3e446e4f28d95ed27ccd5c32e4c8907a";

export const publicClient = createPublicClient({
  chain: monad,
  transport: http(process.env.MONAD_RPC_URL ?? "https://rpc.monad.xyz"),
});
