"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletConnect({ onConnected }: { onConnected: (address: string) => void }) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    onConnected(address);
    return <div className="wallet-status"><span>{address.slice(0, 6)}...{address.slice(-4)}</span><button className="button-secondary" onClick={() => disconnect()}>Disconnect</button></div>;
  }

  return <div className="wallet-connect"><button className="button-primary" disabled={isPending || connectors.length === 0} onClick={() => connectors[0] && connect({ connector: connectors[0] })}>{isPending ? "Connecting..." : "Connect wallet"}</button>{connectors.length === 0 && <p className="error-text">No compatible wallet was detected.</p>}{error && <p className="error-text">{error.message}</p>}</div>;
}
