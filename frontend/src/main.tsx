import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  const [connected, setConnected] = useState(false);
  const [step, setStep] = useState(0);
  const steps = ["Connect wallet", "Create agent account", "Fund account", "Create Perpl account"];

  async function connect() {
    if (!(window as any).ethereum) return alert("Install a wallet such as MetaMask.");
    const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
    if (accounts?.[0]) setConnected(true);
  }

  return <div className="app">
    <header><div className="brand"><span className="mark">A</span><span>ALIAS</span><small>MONAD</small></div><button className="wallet" onClick={connect}>{connected ? "Wallet connected" : "Connect wallet"}</button></header>
    <main>
      <section className="hero"><p className="eyebrow">AI TRADING / MONAD</p><h1>Give your agent a trading account.</h1><p className="sub">Connect a wallet, create a delegated account, fund it with AUSD and let your agent trade Perpl without giving it custody of your funds.</p></section>
      <section className="panel">
        <div className="panelHead"><div><span className="label">ACCOUNT SETUP</span><h2>Get started</h2></div><span className="network">MONAD MAINNET</span></div>
        <div className="steps">{steps.map((s, i) => <div className={`step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} key={s}><span>{i < step ? "✓" : i + 1}</span><b>{s}</b></div>)}</div>
        <div className="action"><div><span className="label">STEP {step + 1}</span><h3>{steps[step]}</h3><p>{step === 0 ? "Connect the wallet that will own your delegated trading account." : step === 1 ? "Create the on-chain account owned by your connected wallet." : step === 2 ? "Move AUSD from your wallet into the delegated account." : "Create the Perpl exchange account using the delegated account."}</p></div><button className="primary" disabled={!connected} onClick={() => setStep(Math.min(step + 1, steps.length - 1))}>{step === 0 ? "Connect wallet" : step === steps.length - 1 ? "Finish setup" : "Continue"}</button></div>
      </section>
      <div className="security"><span>NON-CUSTODIAL</span><span>•</span><span>TRADING-ONLY OPERATOR</span><span>•</span><span>EMERGENCY CLOSE AVAILABLE</span></div>
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
