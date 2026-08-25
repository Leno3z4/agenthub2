"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

async function hasRegisteredAgent(accessKey: string) {
  try {
    const response = await fetch(`${API_URL}/api/agents`, {
      headers: {
        authorization: `Bearer ${accessKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const body = await response.json();
    return Array.isArray(body.agents) && body.agents.length > 0;
  } catch {
    return false;
  }
}

export function LandingConnect({ className }: { className?: string }) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);

    if (!accessKey) {
      return;
    }

    void hasRegisteredAgent(accessKey).then((registered) => {
      if (registered) {
        router.replace("/dashboard");
      }
    });
  }, [isConnected, router]);

  async function handleClick() {
    if (isConnected) {
      const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);

      if (accessKey && await hasRegisteredAgent(accessKey)) {
        router.push("/dashboard");
        return;
      }

      router.push("/onboarding");
      return;
    }

    const connector = connectors[0];

    if (connector) {
      connect({ connector });
    }
  }

  return (
    <button
      className={className}
      onClick={() => void handleClick()}
      disabled={isPending}
    >
      {isPending ? "Connecting" : "Connect wallet"}
    </button>
  );
}
