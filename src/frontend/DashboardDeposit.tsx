import { useState } from "react";
import type { Address, WalletClient } from "viem";
import { depositAUSD } from "./deposit.js";

export function DashboardDeposit({ walletClient, owner, delegatedAccount, ausd, decimals = 18, onDeposited, onAmountChange }: { walletClient: WalletClient; owner: Address; delegatedAccount: Address; ausd: Address; decimals?: number; onDeposited?: (hash: `0x${string}`) => void; onAmountChange?: (amount: bigint) => void }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<`0x${string}`>();
  const [error, setError] = useState<string>();

  async function deposit() {
    setError(undefined);
    if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) return setError("Enter a valid deposit amount.");
    const [whole, fraction = ""] = amount.split(".");
    if (fraction.length > decimals) return setError(`Maximum ${decimals} decimal places.`);
    const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
    setBusy(true);
    try {
      const tx = await depositAUSD(walletClient, owner, ausd, delegatedAccount, units);
      setHash(tx); onAmountChange?.(units); onDeposited?.(tx);
    } catch (err) { setError(err instanceof Error ? err.message : "Deposit failed"); }
    finally { setBusy(false); }
  }

  return <section className="card"><div className="eyebrow">Dashboard / Funding</div><h2>Fund trading account</h2><p>AUSD is transferred from your wallet to your DelegatedAccount. Funding happens here after registration.</p><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" disabled={busy} /><button className="btn" disabled={busy || !amount} onClick={deposit}>{busy ? "Confirm in wallet…" : "Deposit AUSD"}</button>{hash && <p>Deposit submitted: {hash}</p>}{error && <p role="alert">{error}</p>}</section>;
}
