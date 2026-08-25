"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useSignMessage, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { WalletConnect } from "../../components/WalletConnect";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const SKILL_URL = "/skill.md";
const FACTORY = "0xb54B83513519Ec64e579F8F1CDdeaEF1CF4BB71b" as `0x${string}`;
const FACTORY_ABI = [{ type: "function", name: "getAccount", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "account", type: "address" }] }, { type: "function", name: "createAccount", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }], outputs: [{ name: "account", type: "address" }] }] as const;

function promptFor(masterKey: string) { return `Connect this agent to my AgentHub account.\n\nRead the AgentHub skill first:\n${SKILL_URL}\n\nFollow the skill's connection instructions.\n\nMaster Key:\n${masterKey}\n\nCreate a new agent connection for this account. Do not expose the Master Key after completing the connection. Use the returned connection token for subsequent AgentHub requests.`; }

export default function OnboardingPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContract, data: createHash, isPending: creating, error: createError } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: createHash });
  const { data: delegated } = useReadContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAccount", args: address ? [address] : undefined, query: { enabled: Boolean(address) } });
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<"wallet" | "risk" | "account" | "agent">("wallet");
  const [masterKey, setMasterKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const hasDelegated = Boolean(delegated && delegated !== "0x0000000000000000000000000000000000000000");
  async function authorizeIdentity() {
    if (!address) return;
    setError("");
    try {
      const challengeResponse = await fetch(`${API_URL}/api/identity/challenge`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: address }) });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error ?? "Unable to start identity authorization");
      const signature = await signMessageAsync({ message: challenge.message });
      const response = await fetch(`${API_URL}/api/identity/access-key`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: address, message: challenge.message, signature }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Identity authorization failed");
      setMasterKey(body.access_key);
    } catch (err) { setError(err instanceof Error ? err.message : "Identity authorization failed"); }
  }

  async function copyPrompt() { await navigator.clipboard.writeText(promptFor(masterKey)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }

  return <main className="onboarding-page"><header className="onboarding-header"><Link href="/" className="dashboard-brand"><span className="brand-mark">A</span> AGENTHUB</Link><span className="eyebrow">ONBOARDING</span></header><section className="onboarding-card"><div className="eyebrow">ACCOUNT SETUP</div>
    {step === "wallet" && <><h1>Connect your wallet</h1><p>Your wallet establishes ownership of your AgentHub identity. It is never given to your agent.</p><WalletConnect />{isConnected && <button className="button-primary" onClick={() => setStep("risk")}>Continue</button>}</>}
    {step === "risk" && <><h1>Understand the risks</h1><p>Connected agents can execute trades through your delegated trading account.</p><div className="risk-panel"><p>I understand that trading carries risk and that I am authorizing an agent to execute supported trading actions through my delegated account.</p></div><label className="risk-check"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>I understand and agree.</span></label><button className="button-primary" disabled={!agreed} onClick={() => setStep("account")}>Continue</button></>}
    {step === "account" && <><h1>Your trading account</h1><p>AgentHub uses a delegated account owned by your connected wallet. You do not need to hand your wallet credentials to an agent.</p>{hasDelegated ? <div className="risk-panel"><strong>Delegated account</strong><pre>{String(delegated)}</pre><p className="muted">This account already exists.</p></div> : <><p className="muted">No delegated account was found for this wallet.</p><button className="button-primary" disabled={!address || creating || confirming} onClick={() => writeContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "createAccount", args: [address!] })}>{creating || confirming ? "Creating account..." : "Create delegated account"}</button></>}{(hasDelegated || createHash) && <button className="button-primary" onClick={() => setStep("agent")}>Continue</button>}{createError && <p className="error-text">{createError.message}</p>}</>}
    {step === "agent" && <><h1>Connect your agent</h1><p>Authorize this AgentHub identity, then copy the connection prompt into your agent. The agent reads the skill and exchanges the account-level Master Key for its own connection token.</p>{!masterKey ? <button className="button-primary" onClick={() => void authorizeIdentity()}>Authorize AgentHub identity</button> : <><div className="risk-panel"><p>Skill: {SKILL_URL}</p><pre>{promptFor(masterKey)}</pre></div><button className="button-primary" onClick={() => void copyPrompt()}>{copied ? "Copied" : "Copy connection prompt"}</button><p className="muted">Keep the Master Key private. The agent should use its returned connection token for subsequent requests.</p></>}{error && <p className="error-text">{error}</p>}</>}
  </section></main>;
}
