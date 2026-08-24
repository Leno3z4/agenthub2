import { useState } from "react";

export interface AgentConnection { agentId: string; connectionToken: string; }

export function AgentConnect({ onConnected }: { onConnected?: (connection: AgentConnection) => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [connected, setConnected] = useState<string>();

  async function connect() {
    const value = token.trim(); if (!value) return setError("Enter your AgentHub2 identity access key.");
    setBusy(true); setError(undefined);
    try {
      const response = await fetch("/api/agent/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identity_access_key: value, agent_name: "Web-connected agent", connector: "perpl" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Agent connection failed");
      const agentId = String(data.agent_id ?? data.agentId ?? "connected"); const connectionToken = String(data.connection_token ?? "");
      if (!connectionToken) throw new Error("Agent connection was created without a connection credential");
      setConnected(agentId); onConnected?.({ agentId, connectionToken }); setToken("");
    } catch (err) { setError(err instanceof Error ? err.message : "Agent connection failed"); }
    finally { setBusy(false); }
  }

  return <section className="card">
    <div className="eyebrow">Agent / Connection</div>
    <h2>Connect your agent</h2>
    <p>Use your reusable AgentHub2 identity access key to create a connection for this agent. The returned connection credential is specific to that agent.</p>
    <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="AgentHub2 identity access key" autoComplete="off" disabled={busy || !!connected} />
    <button className="btn" disabled={busy || !token.trim() || !!connected} onClick={connect}>{busy ? "Connecting…" : connected ? "Agent connected" : "Connect agent"}</button>
    {connected && <p>Connected agent: {connected}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
