"use client";

import { useState } from "react";
import Link from "next/link";

const SKILL_URL = "/skill.md";
const RISK_TEXT = "I understand that connected agents can execute trades through my delegated trading account. I understand the risks of trading and authorize AgentHub to provide the connection infrastructure.";

function connectionPrompt(masterKey: string) {
  return `Connect this agent to my AgentHub account.\n\nRead the AgentHub skill first:\n${SKILL_URL}\n\nFollow the skill's connection instructions.\n\nMaster Key:\n${masterKey}\n\nCreate a new agent connection for this account. Do not expose the Master Key after completing the connection. Use the returned connection token for subsequent AgentHub requests.`;
}

export default function OnboardingPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [masterKey, setMasterKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"wallet" | "risk" | "agent">("wallet");

  function connectWallet() { setWalletConnected(true); setStep("risk"); }
  function acceptRisk() { if (agreed) setStep("agent"); }
  async function copyPrompt() { await navigator.clipboard.writeText(connectionPrompt(masterKey)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header"><Link href="/" className="dashboard-brand"><span className="brand-mark">A</span> AGENTHUB</Link><span className="eyebrow">ONBOARDING</span></header>
      <section className="onboarding-card">
        <div className="eyebrow">ACCOUNT SETUP</div>
        {step === "wallet" && <><h1>Connect your wallet</h1><p>Your wallet establishes ownership of your AgentHub identity. It is not your agent credential.</p><button className="button-primary" onClick={connectWallet}>Connect wallet</button></>}
        {step === "risk" && <><h1>Understand the risks</h1><p>Review and acknowledge what connecting an agent authorizes.</p><div className="risk-panel"><p>{RISK_TEXT}</p></div><label className="risk-check"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>I understand and agree.</span></label><button className="button-primary" disabled={!agreed} onClick={acceptRisk}>Continue</button></>}
        {step === "agent" && <><h1>Connect your agent</h1><p>Generate a connection prompt, then paste it into your agent. The prompt tells the agent where to read the AgentHub skill and includes your account-level Master Key.</p><label className="field-label" htmlFor="master-key">Master Key</label><input id="master-key" className="text-input" type="password" value={masterKey} onChange={(event) => setMasterKey(event.target.value)} placeholder="ah2_access_..." autoComplete="off" /><div className="risk-panel"><p>Skill: {SKILL_URL}</p><pre>{masterKey ? connectionPrompt(masterKey) : "Your connection prompt will appear here."}</pre></div><button className="button-primary" disabled={!masterKey.trim()} onClick={() => void copyPrompt()}>{copied ? "Copied" : "Copy connection prompt"}</button><p className="muted">Wallet connected: {walletConnected ? "Yes" : "No"}</p></>}
      </section>
    </main>
  );
}
