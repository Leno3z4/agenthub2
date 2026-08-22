import { useState } from "react";
import type { Address, PublicClient, WalletClient } from "viem";
import { connectMonadWallet } from "./monad-wallet.js";
import { checkDelegatedAccount } from "./delegated-account.js";
import { WalletOnboarding } from "./WalletOnboarding.js";

export function WalletOnboardingController({ publicClient }: { publicClient: PublicClient }) {
  const [address, setAddress] = useState<Address>();
  const [walletClient, setWalletClient] = useState<WalletClient>();
  const [delegatedAccount, setDelegatedAccount] = useState<Address>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();

  async function connect() {
    setError(undefined); setChecking(true);
    try {
      const result = await connectMonadWallet();
      setAddress(result.address); setWalletClient(result.walletClient);
      const account = await checkDelegatedAccount(result.address, publicClient);
      setDelegatedAccount(account.exists ? account.address : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
      throw err;
    } finally { setChecking(false); }
  }

  async function handleCreated(hash: `0x${string}`) {
    setError(undefined); setChecking(true);
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Delegated account transaction reverted");
      const account = await checkDelegatedAccount(address!, publicClient);
      if (!account.exists) throw new Error("Transaction confirmed, but the DelegatedAccount was not found");
      setDelegatedAccount(account.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify DelegatedAccount creation");
    } finally { setChecking(false); }
  }

  return <div>
    <WalletOnboarding onConnect={connect} walletClient={walletClient} owner={address} hasDelegatedAccount={!!delegatedAccount} onCreated={handleCreated} />
    {address && <p>Connected: {address}</p>}
    {checking && <p>Checking transaction and delegated account…</p>}
    {!checking && address && (delegatedAccount ? <p>Delegated account: {delegatedAccount}</p> : <p>No delegated account found. Create one to continue.</p>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
