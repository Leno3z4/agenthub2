"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

type EnrollmentStart = {
  enrollment_id: string;
  typed_data: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };
  expires_at: number;
};

async function readJson(response: Response) {
  const text = await response.text();
  let result: Record<string, unknown> = {};
  try {
    result = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    result = { error: text };
  }
  if (!response.ok) {
    throw new Error(String(result.error ?? `Request failed (${response.status})`));
  }
  return result;
}

export function PerplEnrollment() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  async function connectPerpl() {
    const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);

    if (!isConnected || !address) {
      setError("Connect your AgentHub wallet first.");
      return;
    }
    if (!walletClient) {
      setError("Your wallet is not ready yet. Connect it and try again.");
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
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessKey}`,
        },
        body: JSON.stringify({
          wallet_address: address,
          label: "AgentHub2",
        }),
      });

      const start = await readJson(startResponse) as unknown as EnrollmentStart;

      const { EIP712Domain: _ignored, ...signingTypes } = start.typed_data.types;
      const signature = await walletClient.signTypedData({
        account: address,
        domain: start.typed_data.domain as any,
        types: signingTypes as any,
        primaryType: start.typed_data.primaryType as any,
        message: start.typed_data.message as any,
      });

      await readJson(await fetch(`${API_URL}/api/perpl/enroll/complete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessKey}`,
        },
        body: JSON.stringify({
          enrollment_id: start.enrollment_id,
          wallet_signature: signature,
        }),
      }));

      setConnected(true);
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
          <p>Connect Perpl with your AgentHub wallet. No Perpl API key needs to be copied into the dashboard.</p>
        </div>
      </div>

      {connected ? (
        <p className="success-text">Perpl trading is connected.</p>
      ) : (
        <>
          <p className="panel-note">
            AgentHub creates the Ed25519 trading key, asks your wallet to sign the Perpl enrollment payload, and stores the resulting credentials encrypted on the backend.
          </p>
          <button className="button-primary" disabled={busy || !isConnected} onClick={() => void connectPerpl()}>
            {busy ? "Connecting Perpl..." : "Connect Perpl trading"}
          </button>
          {error && <p className="error-text" role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
