import { useState } from "react";
import type { Address, WalletClient } from "viem";
import { submitDelegatedAccountCreation } from "./delegated-account-create.js";

export type OnboardingStep = "wallet" | "delegated" | "fund" | "perpl" | "ready";

export function WalletOnboarding({ onConnect, walletClient, owner, hasDelegatedAccount, onCreated }: { onConnect: () => Promise<void>; walletClient?: WalletClient; owner?: Address; hasDelegatedAccount?: boolean; onCreated?: (hash: `0x${string}`) => void }) {
  const [step, setStep] = useState<OnboardingStep>("wallet");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [error, setError] = useState<string>();

  async function connect() {
    setBusy(true); setError(undefined);
    try { await onConnect(); setStep("delegated"); } catch (err) { setError(err instanceof Error ? err.message : "Wallet connection failed"); throw err; } finally { setBusy(false); }
  }

  async function createAccount() {
    if (!walletClient || !owner) return;
    setBusy(true); setError(undefined);
    try { const { hash } = await submitDelegatedAccountCreation(walletClient, owner); setTxHash(hash); onCreated?.(hash); setStep("fund"); }
    catch (err) { setError(err instanceof Error ? err.message : "Delegated account creation failed"); }
    finally { setBusy(false); }
  }

  const labels: Record<OnboardingStep, string> = { wallet: "Connect wallet", delegated: "Delegated account", fund: "Fund account", perpl: "Create Perpl account", ready: "Ready" };
  return <section className="onboarding card">
    <div className="eyebrow">Account setup</div><h2>Set up your agent account</h2><p>Your wallet remains the owner. Each step requires the appropriate wallet authorization.</p>
    <div className="steps">{(Object.keys(labels) as OnboardingStep[]).map((name, index) => <div className={`step ${step === name ? "active" : ""}`} key={name}><b>{String(index + 1).padStart(2, "0")}</b><span>{labels[name]}</span></div>)}</div>
    {step === "wallet" && <button className="btn" disabled={busy} onClick={connect}>{busy ? "Connecting…" : "Connect wallet"}</button>}
    {step === "delegated" && hasDelegatedAccount && <button className="btn" onClick={() => setStep("fund")}>Continue</button>}
    {step === "delegated" && !hasDelegatedAccount && <button className="btn" disabled={busy || !walletClient || !owner} onClick={createAccount}>{busy ? "Confirm in wallet…" : "Create DelegatedAccount"}</button>}
    {txHash && <p>Transaction submitted: {txHash}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
