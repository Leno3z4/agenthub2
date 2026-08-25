"use client";

import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function WalletConnect({ onAuthorized }: { onAuthorized: (data: { owner: string; delegatedAccount: string; accessKey: string }) => void }) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: signing } = useSignMessage();

  useEffect(() => {
    if (!address || !isConnected) return;
    let cancelled = false;
    (async () => {
      const challengeResponse = await fetch(`${API_URL}/api/identity/challenge`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: address }),
      });
      if (!challengeResponse.ok) throw new Error("Unable to start wallet authorization");
      const challenge = await challengeResponse.json() as { message: string };
      const signature = await signMessageAsync({ message: challenge.message });
      const authResponse = await fetch(`${API_URL}/api/identity/access-key`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: address, message: challenge.message, signature }),
      });
      if (!authResponse.ok) {
        const body = await authResponse.json().catch(() => ({}));
        throw new Error(body.error ?? "Wallet authorization failed");
      }
      const data = await authResponse.json() as { owner: string; delegated_account: string; access_key: string };
      if (!cancelled) onAuthorized({ owner: data.owner, delegatedAccount: data.delegated_account, accessKey: data.access_key });
    })().catch((error) => { if (!cancelled) console.error(error); });
    return () => { cancelled = true; };
  }, [address, isConnected, signMessageAsync, onAuthorized]);

  if (isConnected && address) return <div className="wallet-status"><span>{address.slice(0, 6)}...{address.slice(-4)}</span><button className="button-secondary" onClick={() => disconnect()}>Disconnect</button>{signing && <span className="muted">Authorizing...</span>}</div>;
  return <div className="wallet-connect"><button className="button-primary" disabled={isPending} onClick={() => connectors[0] && connect({ connector: connectors[0] })}>{isPending ? "Connecting..." : "Connect wallet"}</button>{connectError && <p className="error-text">{connectError.message}</p>}</div>;
}
