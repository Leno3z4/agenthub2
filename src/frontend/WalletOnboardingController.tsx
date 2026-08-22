import { useState } from "react";
import type { Address } from "viem";
import { connectMonadWallet } from "./monad-wallet.js";
import { WalletOnboarding } from "./WalletOnboarding.js";

export function WalletOnboardingController() {
  const [address, setAddress] = useState<Address>();
  const [error, setError] = useState<string>();

  async function connect() {
    setError(undefined);
    try {
      const result = await connectMonadWallet();
      setAddress(result.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
      throw err;
    }
  }

  return <div><WalletOnboarding onConnect={connect} />{address && <p>Connected: {address}</p>}{error && <p role="alert">{error}</p>}</div>;
}
