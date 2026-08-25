"use client";

import Link from "next/link";
import { WalletButton } from "./WalletButton";
import { DashboardLink } from "./DashboardLink";

export function Navbar() {
  return (
    <header className="navbar">
      <Link href="/" className="brand">
        <span className="brand-mark">A</span>
        <span>AGENTHUB</span>
      </Link>

      <nav className="nav-links">
        <DashboardLink>Dashboard</DashboardLink>
        <a href="#markets">Markets</a>
        <a href="#agents">Agents</a>
        <a href="#docs">Docs</a>
      </nav>

      <WalletButton />
    </header>
  );
}
