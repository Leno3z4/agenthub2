import { useState } from "react";

export type OnboardingStep = "wallet" | "delegated" | "fund" | "perpl" | "ready";

export function WalletOnboarding({ onConnect }: { onConnect: () => Promise<void> }) {
  const [step, setStep] = useState<OnboardingStep>("wallet");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      await onConnect();
      setStep("delegated");
    } finally {
      setBusy(false);
    }
  }

  const labels: Record<OnboardingStep, string> = {
    wallet: "Connect wallet",
    delegated: "Delegated account",
    fund: "Fund account",
    perpl: "Create Perpl account",
    ready: "Ready",
  };

  return (
    <section className="onboarding card">
      <div className="eyebrow">Account setup</div>
      <h2>Set up your agent account</h2>
      <p>Your wallet remains the owner. Each step requires the appropriate wallet authorization.</p>
      <div className="steps">
        {(Object.keys(labels) as OnboardingStep[]).map((name, index) => (
          <div className={`step ${step === name ? "active" : ""}`} key={name}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>{labels[name]}</span>
          </div>
        ))}
      </div>
      <button className="btn" disabled={busy || step !== "wallet"} onClick={connect}>
        {busy ? "Connecting…" : "Connect wallet"}
      </button>
    </section>
  );
}
