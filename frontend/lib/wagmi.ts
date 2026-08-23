import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
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
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://monadscan.com",
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [agentHubChain],
  connectors: [
    injected(),
  ],
  transports: {
    [agentHubChain.id]: http(),
  },
});
