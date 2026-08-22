import { useState } from "react";

export interface AgentConnection {
  agentId: string;
  connectionToken: string;
}

export function AgentConnect({ onConnected }: { onConnected?: (connection: AgentConnection) => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [connected, setConnected] = useState<string>();

  async function connect() {
    const value = token.trim();
    if (!value) return setError("Enter an agent connection token.");
    setBusy(true); setError(undefined);
    try {
      const response = await fetch("/api/agent/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connection_token: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Agent connection failed");
      const agentId = String(data.agent_id ?? data.agentId ?? "connected");
      setConnected(agentId);
      onConnected?.({ agentId, connectionToken: value });
      setToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent connection failed");
    } finally { setBusy(false); }
  }

  return <section className="card">
    <div className="eyebrow">Agent / Connection</div>
    <h2>Connect your agent</h2>
    <p>Connect an agent using its one-time connection token. The token is sent only to the connection endpoint and cleared from the form after success.</p>
    <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Agent connection token" autoComplete="off" disabled={busy || !!connected} />
    <button className="btn" disabled={busy || !token.trim() || !!connected} onClick={connect}>{busy ? "Connecting…" : connected ? "Agent connected" : "Connect agent"}</button>
    {connected && <p>Connected agent: {connected}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
