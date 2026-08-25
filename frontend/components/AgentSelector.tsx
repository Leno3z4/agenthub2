"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

type Agent = {
  id: string;
  name: string;
  status: "active" | "revoked";
  connector: string | null;
  connectionStatus: string | null;
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
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load agents");
      setAgents(Array.isArray(data.agents) ? data.agents : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load agents");
    } finally {
      setLoading(false);
    }
  }

  async function connectAnotherAgent() {
    const key = window.localStorage.getItem(ACCESS_KEY_STORAGE);
    if (!key) return setError("Reconnect your wallet to continue.");
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
      setError("");
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
    if (!response.ok) return setError(data.error ?? "Unable to disconnect agent");
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

  const activeCount = agents.filter((agent) => agent.status === "active").length;

  return (
    <div className="agent-selector">
      <button
        className="agent-selector-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Agents
        <span>{loading ? "..." : activeCount}</span>
      </button>

      {open && (
        <div className="agent-selector-menu">
          <div className="agent-selector-heading">
            <strong>Your agents</strong>
            <button type="button" onClick={() => void loadAgents()}>
              Refresh
            </button>
          </div>

          {agents.length === 0 && !loading && (
            <p className="muted">No connected agents yet.</p>
          )}

          {agents.map((agent) => (
            <div key={agent.id} className="agent-selector-row">
              <div>
                <strong>{agent.name}</strong>
                <p className="muted">
                  {agent.connector ?? "Agent"} · {agent.connectionStatus ?? agent.status}
                </p>
              </div>
              <button type="button" onClick={() => void revokeAgent(agent.id)}>
                Disconnect
              </button>
            </div>
          ))}

          <div className="agent-selector-connect">
            <strong>Connect another agent</strong>
            <p className="muted">Create a prompt for another agent to access this account.</p>
            <button className="button-primary" type="button" onClick={() => void connectAnotherAgent()}>
              Generate connection prompt
            </button>
          </div>

          {prompt && (
            <div className="agent-selector-prompt">
              <pre>{prompt}</pre>
              <button className="button-primary" type="button" onClick={() => void copyPrompt()}>
                {copied ? "Copied" : "Copy prompt"}
              </button>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
        </div>
      )}
    </div>
  );
}
