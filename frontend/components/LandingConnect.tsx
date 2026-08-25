"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

async function getRegisteredAgentState(accessKey: string) {
  try {
    const response = await fetch(`${API_URL}/api/agents`, {
      headers: {
        authorization: `Bearer ${accessKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { authenticated: false, registered: false };
    }

    const body = await response.json();
    return {
      authenticated: true,
      registered: Array.isArray(body.agents) && body.agents.length > 0,
    };
  } catch {
    return { authenticated: false, registered: false };
  }
}

async function createIdentitySession(address: string) {
  const challengeResponse = await fetch(`${API_URL}/api/identity/challenge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ owner: address }),
  });

  const challenge = await challengeResponse.json();
  if (!challengeResponse.ok) {
    throw new Error(challenge.error ?? "Unable to authorize AgentHub");
  }

  return challenge;
}

export function LandingConnect({ className }: { className?: string }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      return;
    }

    const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);
    if (!accessKey) {
      return;
    }

    setChecking(true);
    void getRegisteredAgentState(accessKey).then((state) => {
      setChecking(false);
      if (state.authenticated && state.registered) {
        router.replace("/dashboard");
      }
    });
  }, [address, isConnected, router]);

  async function handleClick() {
    if (!isConnected || !address) {
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
      return;
    }

    const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);

    if (accessKey) {
      const state = await getRegisteredAgentState(accessKey);
      if (state.authenticated && state.registered) {
        router.push("/dashboard");
        return;
      }
    }

    router.push("/onboarding");
  }

  return (
    <button
      className={className}
      onClick={() => void handleClick()}
      disabled={isPending || checking}
    >
      {isPending || checking ? "Connecting" : "Connect wallet"}
    </button>
  );
}
