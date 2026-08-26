"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";
const PERPL_API_KEYS_URL = "https://app.perpl.xyz/apikeys";

export function PerplEnrollment() {
  const { isConnected } = useAccount();
  const [apiKey, setApiKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  async function connectPerpl() {
    const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);
    if (!isConnected) {
      setError("Connect your AgentHub wallet first.");
      return;
    }
    if (!accessKey) {
      setError("Your AgentHub identity is not authorized. Return to onboarding first.");
      return;
    }
    if (!apiKey.trim() || !privateKey.trim()) {
      setError("Paste both the Perpl API key and private key from the Perpl API keys page.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/perpl/connect`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessKey}`,
        },
        body: JSON.stringify({ api_key: apiKey.trim(), private_key: privateKey.trim() }),
      });
      const text = await response.text();
      let result: Record<string, unknown> = {};
      try {
        result = text ? JSON.parse(text) as Record<string, unknown> : {};
      } catch {
        result = { error: text };
      }
      if (!response.ok) throw new Error(String(result.error ?? `Perpl connection failed (${response.status})`));
      setConnected(true);
      setApiKey("");
      setPrivateKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Perpl connection failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dashboard-card">
      <div className="section-heading">
        <div>
          <h2>Perpl trading connection</h2>
          <p>Create a read + trade API key in Perpl, then connect it to AgentHub.</p>
        </div>
      </div>
      {connected ? (
        <p className="success-text">Perpl trading is connected.</p>
      ) : (
        <>
          <a className="button-secondary" href={PERPL_API_KEYS_URL} target="_blank" rel="noreferrer">
            Open Perpl API keys
          </a>
          <label className="field">
            <span>PERPL API KEY</span>
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste your X-API-Key token" autoComplete="off" disabled={busy} />
          </label>
          <label className="field">
            <span>PERPL PRIVATE KEY</span>
            <input type="password" value={privateKey} onChange={(event) => setPrivateKey(event.target.value)} placeholder="Paste your 32-byte Ed25519 private key" autoComplete="off" disabled={busy} />
          </label>
          <p className="panel-note">AgentHub stores both values encrypted on the backend and uses them only to sign Perpl requests. Never paste a wallet seed phrase or wallet private key here.</p>
          <button className="button-primary" disabled={busy || !isConnected} onClick={() => void connectPerpl()}>
            {busy ? "Checking Perpl key..." : "Connect Perpl trading"}
          </button>
          {error && <p className="error-text" role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
