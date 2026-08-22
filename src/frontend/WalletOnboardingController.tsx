import { useState } from "react";
import type { Address, PublicClient } from "viem";
import { connectMonadWallet } from "./monad-wallet.js";
import { checkDelegatedAccount } from "./delegated-account.js";
import { WalletOnboarding } from "./WalletOnboarding.js";

export function WalletOnboardingController({ publicClient }: { publicClient: PublicClient }) {
  const [address, setAddress] = useState<Address>();
  const [delegatedAccount, setDelegatedAccount] = useState<Address>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();

  async function connect() {
    setError(undefined);
    setChecking(true);
    try {
      const result = await connectMonadWallet();
      setAddress(result.address);
      const account = await checkDelegatedAccount(result.address, publicClient);
      setDelegatedAccount(account.exists ? account.address : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
      throw err;
    } finally {
      setChecking(false);
    }
  }

  return <div>
    <WalletOnboarding onConnect={connect} />
    {address && <p>Connected: {address}</p>}
    {checking && <p>Checking delegated account…</p>}
    {!checking && address && (delegatedAccount
      ? <p>Delegated account: {delegatedAccount}</p>
      : <p>No delegated account found. Create one to continue.</p>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
