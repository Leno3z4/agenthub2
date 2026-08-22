import { useState } from "react";
import type { Address, WalletClient, PublicClient } from "viem";
import { preparePerplOnboarding, executePerplAccountCreation } from "../perpl/onboarding.js";

export function PerplAccountSetup({ owner, delegatedAccount, walletClient, publicClient, collateralToken, amount }: { owner: Address; delegatedAccount: Address; walletClient: WalletClient; publicClient: PublicClient; collateralToken: Address; amount: bigint }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>();
  const [accountId, setAccountId] = useState<bigint>();
  const [error, setError] = useState<string>();

  async function create() {
    setBusy(true); setError(undefined); setStatus("Checking Perpl account…");
    try {
      const state = await preparePerplOnboarding({ owner, delegatedAccount, collateralToken, amount, client: publicClient });
      if (state.status === "ready") { setAccountId(state.accountId); setStatus("Perpl account ready"); return; }
      setStatus("Creating Perpl account…");
      const hash = await executePerplAccountCreation({ walletClient, owner, delegatedAccount, amount });
      setStatus("Waiting for confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      const confirmed = await preparePerplOnboarding({ owner, delegatedAccount, collateralToken, amount, client: publicClient });
      if (confirmed.status !== "ready") throw new Error("Perpl account was not found after confirmation");
      setAccountId(confirmed.accountId); setStatus("Perpl account ready");
    } catch (e) { setError(e instanceof Error ? e.message : "Perpl account creation failed"); setStatus(undefined); }
    finally { setBusy(false); }
  }

  return <section className="card"><div className="eyebrow">Perpl</div><h3>Create trading account</h3><p>Your AUSD deposit remains in the delegated account and is used as Perpl collateral.</p><button className="btn" disabled={busy} onClick={create}>{busy ? "Processing…" : "Create Perpl Account"}</button>{status && <p>{status}</p>}{accountId !== undefined && <p>Account ID: {accountId.toString()}</p>}{error && <p role="alert">{error}</p>}</section>;
}
