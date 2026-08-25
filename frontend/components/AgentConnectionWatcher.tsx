"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

export function AgentConnectionWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected } = useAccount();
  const [hasAccessKey, setHasAccessKey] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setHasAccessKey(
      Boolean(window.localStorage.getItem(ACCESS_KEY_STORAGE)),
    );
  }, [pathname, isConnected]);

  async function checkConnection() {
    const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);

    if (!accessKey) {
      setHasAccessKey(false);
      return;
    }

    setChecking(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/agents`, {
        headers: { authorization: `Bearer ${accessKey}` },
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const body = await response.json();
      const agents = Array.isArray(body.agents) ? body.agents : [];

      if (agents.length > 0) {
        router.replace("/dashboard");
        return;
      }

      setMessage("No agent connection yet. Try again after your agent finishes connecting.");
    } catch {
      setMessage("Unable to check the agent connection right now.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!isConnected || !hasAccessKey || pathname !== "/onboarding") {
      return;
    }

    void checkConnection();
    const timer = window.setInterval(() => {
      void checkConnection();
    }, 4000);

    return () => window.clearInterval(timer);
  }, [isConnected, hasAccessKey, pathname]);

  if (
    pathname !== "/onboarding" ||
    !isConnected ||
    !hasAccessKey
  ) {
    return null;
  }

  return (
    <div className="agent-connection-check">
      <button
        className="button-primary"
        type="button"
        disabled={checking}
        onClick={() => void checkConnection()}
      >
        {checking ? "Checking connection..." : "Check agent connection"}
      </button>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
