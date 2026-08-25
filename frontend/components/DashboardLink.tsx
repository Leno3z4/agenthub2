"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

type Props = {
  className?: string;
  children: React.ReactNode;
  href?: string;
};

export function DashboardLink({ className, children, href = "/onboarding" }: Props) {
  const { isConnected } = useAccount();
  const [hasSavedIdentity, setHasSavedIdentity] = useState(false);

  useEffect(() => {
    setHasSavedIdentity(
      Boolean(window.localStorage.getItem(ACCESS_KEY_STORAGE)),
    );
  }, [isConnected]);

  const destination = isConnected && hasSavedIdentity ? "/dashboard" : href;

  return (
    <Link href={destination} className={className}>
      {children}
    </Link>
  );
}
