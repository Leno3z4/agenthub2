"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

export function DashboardLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isConnected } = useAccount();
  const [hasSavedIdentity, setHasSavedIdentity] = useState(false);

  useEffect(() => {
    setHasSavedIdentity(
      Boolean(window.localStorage.getItem(ACCESS_KEY_STORAGE)),
    );
  }, [isConnected]);

  const href = isConnected && hasSavedIdentity ? "/dashboard" : "/onboarding";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
