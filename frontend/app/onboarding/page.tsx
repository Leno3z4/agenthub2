"use client";

import { useState } from "react";
import Link from "next/link";

const RISK_TEXT = "I understand that connected agents can execute trades through my delegated trading account. I understand the risks of trading and authorize AgentHub to provide the connection infrastructure.";

export default function OnboardingPage() {
  const [wallet, setWallet] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [agentKey, setAgentKey] = useState("");
  const [step, setStep] = useState<"wallet" | "risk" | "agent">("wallet");

  function connectWallet() {
    setWallet("Wallet connected");
    setStep("risk");
  }

  function acceptRisk() {
    if (!agreed) return;
    setStep("agent");
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <Link href="/" className="dashboard-brand"><span className="brand-mark">A</span> AGENTHUB</Link>
        <span className="eyebrow">ONBOARDING</span>
      </header>

      <section className="onboarding-card">
        <div className="eyebrow">ACCOUNT SETUP</div>
        {step === "wallet" && <>
          <h1>Connect your wallet</h1>
          <p>Your wallet is used to establish ownership of your AgentHub identity. It is not your agent credential.</p>
          <button className="button-primary" onClick={connectWallet}>Connect wallet</button>
        </>}

        {step === "risk" && <>
          <h1>Understand the risks</h1>
          <p>Before creating your agent connection, review and acknowledge what you are authorizing.</p>
          <div className="risk-panel"><p>{RISK_TEXT}</p></div>
          <label className="risk-check"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /> <span>I understand and agree.</span></label>
          <button className="button-primary" disabled={!agreed} onClick={acceptRisk}>Continue</button>
        </>}

        {step === "agent" && <>
          <h1>Connect your agent</h1>
          <p>Enter your AgentHub Master Key to connect an agent to this identity. Keep this key private.</p>
          <label className="field-label" htmlFor="agent-key">Master Key</label>
          <input id="agent-key" className="text-input" type="password" value={agentKey} onChange={(event) => setAgentKey(event.target.value)} placeholder="ah2_access_..." autoComplete="off" />
          <button className="button-primary" disabled={!agentKey.trim()} onClick={() => { window.location.href = "/dashboard"; }}>Connect agent</button>
          <p className="muted">{wallet}</p>
        </>}
      </section>
    </main>
  );
}
