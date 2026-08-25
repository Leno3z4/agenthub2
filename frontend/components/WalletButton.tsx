"use client";

import {
  useAccount,
  useDisconnect,
  useSwitchChain,
  useConnect,
} from "wagmi";
import { agentHubChain } from "../lib/wagmi";

const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { connect, connectors, isPending } = useConnect();

  if (isConnected && address) {
    if (chainId !== agentHubChain.id) {
      return (
        <button
          className="wallet-button"
          onClick={() => switchChain({ chainId: agentHubChain.id })}
        >
          Switch to Monad
        </button>
      );
    }

    return (
      <button
        className="wallet-button"
        onClick={() => {
          window.localStorage.removeItem(ACCESS_KEY_STORAGE);
          disconnect();
        }}
      >
        <span className="wallet-dot" />
        {shortenAddress(address)}
      </button>
    );
  }

  const connector = connectors[0];

  return (
    <button
      className="wallet-button"
      disabled={isPending || !connector}
      onClick={() => {
        if (connector) {
          connect({ connector });
        }
      }}
    >
      <span className="wallet-dot" />
      {isPending ? "Connecting..." : "Connect wallet"}
    </button>
  );
}
