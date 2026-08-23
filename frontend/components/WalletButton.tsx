"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        className="wallet-button"
        onClick={() => disconnect()}
      >
        <span className="wallet-dot" />
        {shortenAddress(address)}
      </button>
    );
  }

  return (
    <button
      className="wallet-button"
      disabled={isPending}
      onClick={() => {
        const connector = connectors[0];

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
