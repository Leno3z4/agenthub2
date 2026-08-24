import { createConfig, custom } from "wagmi";
import { defineChain } from "viem";

export const agentHubChain = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.monad.xyz"],
    },
  },
});

const injectedProvider =
  typeof window !== "undefined"
    ? (window as any).ethereum
    : undefined;

export const wagmiConfig = createConfig({
  chains: [agentHubChain],
  transports: {
    [agentHubChain.id]: custom(
      injectedProvider,
    ),
  },
});
