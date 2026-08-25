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
      router.replace("/onboarding");
      return;
    }

    setChecking(true);
    void getRegisteredAgentState(accessKey).then((state) => {
      setChecking(false);

      if (state.authenticated && state.registered) {
        router.replace("/dashboard");
        return;
      }

      if (!state.authenticated) {
        window.localStorage.removeItem(ACCESS_KEY_STORAGE);
      }

      router.replace("/onboarding");
    });
  }, [address, isConnected, router]);

  function handleClick() {
    if (!isConnected) {
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
      return;
    }

    void (async () => {
      const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);

      if (accessKey) {
        const state = await getRegisteredAgentState(accessKey);
        if (state.authenticated && state.registered) {
          router.push("/dashboard");
          return;
        }
      }

      router.push("/onboarding");
    })();
  }

  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={isPending || checking}
    >
      {isPending || checking ? "Connecting" : "Connect wallet"}
    </button>
  );
}
