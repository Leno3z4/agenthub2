import { createPublicClient, http, type Address, defineChain } from "viem";

export const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_RPC_URL ?? "https://rpc.monad.xyz"] } },
});

export const PERPL_EXCHANGE: Address = "0x34B6552d57a35a1D042CcAe1951BD1C370112a6F";
export const INVAIRIANT_FACTORY: Address = "0xb54B83513519Ec64e579F8F1CDdeaEF1CF4BB71b";
export const INVAIRIANT_IMPLEMENTATION: Address = "0x0CBBaB6F3f5915EBe3054Af76ef7e5c638AADa2e";

export const publicClient = createPublicClient({
  chain: monad,
  transport: http(process.env.MONAD_RPC_URL ?? "https://rpc.monad.xyz"),
});
