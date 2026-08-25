"use client";

import Link from "next/link";
import { useDisconnect } from "wagmi";

const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

const accountLinks = [
  { label: "Overview", href: "/dashboard" },
  { label: "History", href: "/account/history" },
  { label: "PnL", href: "/account/pnl" },
  { label: "Buys", href: "/account/buys" },
  { label: "Sells", href: "/account/sells" },
];

export function DashboardNavigation() {
  const { disconnect } = useDisconnect();

  function disconnectWallet() {
    window.localStorage.removeItem(ACCESS_KEY_STORAGE);
    disconnect();
    window.location.assign("/onboarding");
  }

  return (
    <nav className="dashboard-navigation" aria-label="Dashboard navigation">
      <Link className="dashboard-navigation-link" href="/dashboard">
        Dashboard
      </Link>

      <details className="dashboard-navigation-menu">
        <summary>Account</summary>
        <div className="dashboard-navigation-dropdown">
          {accountLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </details>

      <details className="dashboard-navigation-menu">
        <summary>Settings</summary>
        <div className="dashboard-navigation-dropdown">
          <button type="button" onClick={disconnectWallet}>
            Disconnect wallet
          </button>
        </div>
      </details>
    </nav>
  );
}
