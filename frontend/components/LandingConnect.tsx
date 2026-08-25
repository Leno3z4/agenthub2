"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { useRouter } from "next/navigation";

const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

export function LandingConnect({ className }: { className?: string }) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const hasSavedIdentity = Boolean(
      window.localStorage.getItem(ACCESS_KEY_STORAGE),
    );

    if (hasSavedIdentity) {
      router.replace("/dashboard");
    }
  }, [isConnected, router]);

  function handleClick() {
    if (isConnected) {
      router.push("/onboarding");
      return;
    }

    const connector = connectors[0];

    if (connector) {
      connect({ connector });
    }
  }

  return (
    <button className={className} onClick={handleClick} disabled={isPending}>
      {isPending ? "Connecting" : "Connect wallet"}
    </button>
  );
}
