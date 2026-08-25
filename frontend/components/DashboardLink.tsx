"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

export function DashboardLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const hasSavedIdentity = typeof window !== "undefined"
    && Boolean(window.localStorage.getItem(ACCESS_KEY_STORAGE));

  const href = isConnected && hasSavedIdentity ? "/dashboard" : "/onboarding";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
