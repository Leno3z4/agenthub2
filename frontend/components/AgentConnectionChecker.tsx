"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

export function AgentConnectionChecker({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  async function checkConnection() {
    const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);

    if (!accessKey) {
      setMessage("Your AgentHub session is unavailable. Start onboarding again.");
      return false;
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

      if (!response.ok) {
        setMessage("We could not check the agent connection yet.");
        return false;
      }

      const body = await response.json();
      const agents = Array.isArray(body.agents) ? body.agents : [];

      if (agents.length > 0) {
        router.replace("/dashboard");
        return true;
      }

      setMessage("No agent connection yet. Keep the connection prompt in your agent and try again.");
      return false;
    } catch {
      setMessage("We could not check the agent connection yet.");
      return false;
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled) {
        return;
      }
      await checkConnection();
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
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
