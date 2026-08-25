"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isConnected, isConnecting, isReconnecting } = useAccount();

  useEffect(() => {
    if (isConnecting || isReconnecting) {
      return;
    }

    if (!isConnected) {
      window.localStorage.removeItem(ACCESS_KEY_STORAGE);
      router.replace("/onboarding");
      return;
    }

    const hasSavedIdentity = Boolean(
      window.localStorage.getItem(ACCESS_KEY_STORAGE),
    );

    if (!hasSavedIdentity) {
      router.replace("/onboarding");
    }
  }, [isConnected, isConnecting, isReconnecting, router]);

  if (isConnecting || isReconnecting) {
    return null;
  }

  return <>{children}</>;
}
