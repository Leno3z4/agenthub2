"use client";

import { useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

type TypedDataPayload = {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
};

export function PerplEnrollment() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  async function readJson(response: Response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) as Record<string, unknown> : {};
    } catch {
      return { error: text || `Request failed (${response.status})` };
    }
  }

  async function enroll() {
    const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);
    if (!isConnected || !address) {
      setError("Connect the wallet that owns this AgentHub account first.");
      return;
    }
    if (!accessKey) {
      setError("Your AgentHub identity is not authorized. Return to onboarding first.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const startResponse = await fetch(`${API_URL}/api/perpl/enroll/start`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessKey}` },
        body: JSON.stringify({ label: "AgentHub", wallet_address: address }),
      });
      const start = await readJson(startResponse);
      if (!startResponse.ok) throw new Error(String(start.error ?? `Unable to start Perpl enrollment (${startResponse.status})`));

      const typedData = start.typed_data as TypedDataPayload;
      if (!typedData?.domain || !typedData?.types || !typedData?.primaryType || !typedData?.message) {
        throw new Error("Perpl returned an invalid signing payload.");
      }

      let walletSignature: string;
      try {
        walletSignature = await signTypedDataAsync(typedData as any);
      } catch (err) {
        throw new Error(err instanceof Error ? `Wallet signature failed: ${err.message}` : "Wallet signature failed.");
      }

      const completeResponse = await fetch(`${API_URL}/api/perpl/enroll/complete`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessKey}` },
        body: JSON.stringify({ enrollment_id: start.enrollment_id, wallet_signature: walletSignature }),
      });
      const complete = await readJson(completeResponse);
      if (!completeResponse.ok) throw new Error(String(complete.error ?? `Perpl enrollment failed (${completeResponse.status})`));
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Perpl enrollment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dashboard-card">
      <div className="section-heading">
        <div>
          <h2>Perpl trading connection</h2>
          <p>Enable the authenticated Perpl session used for positions, orders, balances and trading state.</p>
        </div>
      </div>
      {connected ? (
        <p className="success-text">Perpl trading is connected.</p>
      ) : (
        <>
          <button className="button-primary" disabled={busy || !isConnected} onClick={() => void enroll()}>
            {busy ? "Connecting to Perpl..." : "Connect Perpl trading"}
          </button>
          {error && <p className="error-text" role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
