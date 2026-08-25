"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

type Agent = {
  id: string;
  name: string;
  status: "active" | "revoked";
  connector: string | null;
  connectionStatus: string | null;
  expiresAt: string | null;
  createdAt: string;
  lastActive: string | null;
};

export function AgentSelector() {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function loadAgents() {
    const key = window.localStorage.getItem(ACCESS_KEY_STORAGE);
    if (!key) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/agents`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load agents");
      setAgents(data.agents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load agents");
    } finally {
      setLoading(false);
    }
  }

  async function connectAnotherAgent() {
    const key = window.localStorage.getItem(ACCESS_KEY_STORAGE);
    if (!key) {
      setError("Reconnect your wallet to continue.");
      return;
    }

    setError("");
    try {
      const response = await fetch(`${API_URL}/api/agents/connect-prompt`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to create connection prompt");
      setPrompt(data.prompt ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create connection prompt");
    }
  }

  async function revokeAgent(id: string) {
    const key = window.localStorage.getItem(ACCESS_KEY_STORAGE);
    if (!key) return;

    const response = await fetch(`${API_URL}/api/agents/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to disconnect agent");
      return;
    }
    await loadAgents();
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    void loadAgents();
  }, []);

  return (
    <section className="status-panel">
      <div>
        <h2>Agents</h2>
        <p className="panel-note">Manage connected agents and create new agent connections.</p>
      </div>

      <div>
        <button className="action-button" onClick={() => setOpen(!open)}>
          {loading ? "Loading agents..." : `${agents.length} connected agent${agents.length === 1 ? "" : "s"}`}
        </button>

        {open && (
          <div className="risk-panel">
            {agents.length === 0 && !loading && <p className="muted">No connected agents yet.</p>}

            {agents.map((agent) => (
              <div key={agent.id} className="agent-row">
                <div>
                  <strong>{agent.name}</strong>
                  <p className="muted">
                    {agent.connector ?? "No connector"} · {agent.connectionStatus ?? agent.status}
                  </p>
                </div>
                <button className="action-button" onClick={() => void revokeAgent(agent.id)}>
                  Disconnect
                </button>
              </div>
            ))}

            <div className="agent-connect-block">
              <h3>Connect another agent</h3>
              <p className="muted">Generate a connection prompt for another agent to access this account.</p>
              <button className="button-primary" onClick={() => void connectAnotherAgent()}>
                Generate connection prompt
              </button>
            </div>

            {prompt && (
              <div className="agent-prompt">
                <pre>{prompt}</pre>
                <button className="button-primary" onClick={() => void copyPrompt()}>
                  {copied ? "Copied" : "Copy prompt"}
                </button>
              </div>
            )}

            {error && <p className="error-text">{error}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
