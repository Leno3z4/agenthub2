"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

export function AgentConnectionChecker() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  async function checkConnection() {
    const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);

    if (!accessKey) {
      setMessage("Your AgentHub session is unavailable. Start onboarding again.");
      return;
    }

    setChecking(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/agents`, {
        headers: {
          authorization: `Bearer ${accessKey}`,
        },
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          body.error ?? "Unable to check the agent connection yet.",
        );
      }

      const agents = Array.isArray(body.agents) ? body.agents : [];
      const activeAgent = agents.find(
        (agent: { status?: string }) => agent.status === "active",
      );

      if (!activeAgent) {
        setMessage(
          "No connected agent found yet. Try again after your agent finishes connecting.",
        );
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to check the agent connection yet.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="agent-connection-check">
      <button
        className="button-primary"
        type="button"
        onClick={() => void checkConnection()}
        disabled={checking}
      >
        {checking ? "Checking connection..." : "Check agent connection"}
      </button>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
