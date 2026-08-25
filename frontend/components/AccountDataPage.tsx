"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardGate } from "./DashboardGate";
import { DashboardNavigation } from "./DashboardNavigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

type Row = Record<string, unknown>;
type AccountData = {
  identity_id: string;
  owner: string;
  delegatedAccount: string;
  perplAccountId: string;
  sessionOpen: boolean;
  state: {
    status?: string;
    account?: Row | null;
    orders?: Row[];
    positions?: Row[];
    stale?: boolean;
    sequenceGap?: boolean;
  };
};

type Props = { title: string; description: string; mode: "overview" | "history" | "pnl" | "buys" | "sells" };

function text(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return "—";
}

function number(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function AccountDataPage({ title, description, mode }: Props) {
  const [data, setData] = useState<AccountData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const key = window.localStorage.getItem(ACCESS_KEY_STORAGE);
    if (!key) {
      setError("Connect your wallet to view account data.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/account/state`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to load account data");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load account data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const orders = data?.state.orders ?? [];
  const positions = data?.state.positions ?? [];
  const filteredOrders = useMemo(() => orders.filter((row) => {
    const side = text(row, ["side", "direction", "order_side"]).toLowerCase();
    return mode === "buys" ? side === "buy" || side === "long" : side === "sell" || side === "short";
  }), [orders, mode]);
  const pnlRows = useMemo(() => positions.filter((row) => number(row, ["pnl", "unrealizedPnl", "unrealized_pnl", "pnlUsd", "pnl_usd"]) !== null), [positions]);

  return (
    <DashboardGate>
      <main className="dashboard">
        <header className="dashboard-nav">
          <DashboardNavigation />
          <span className="wallet-address">Connected wallet</span>
        </header>
        <div className="dashboard-container">
          <Link className="muted" href="/dashboard">Back to dashboard</Link>
          <div className="dashboard-heading">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          {loading && <section className="status-panel"><p className="muted">Loading account data...</p></section>}
          {error && <section className="status-panel"><p className="error-text">{error}</p></section>}

          {data && (
            <>
              <section className="status-panel">
                <div className="status-data">
                  <div><span className="muted">Account</span><strong>{data.perplAccountId}</strong></div>
                  <div><span className="muted">Delegated account</span><strong>{data.delegatedAccount}</strong></div>
                  <div><span className="muted">Status</span><strong>{data.state.status ?? "connected"}</strong></div>
                </div>
              </section>

              {mode === "overview" && (
                <section className="status-panel">
                  <h2>Current account</h2>
                  <p className="muted">Live data from the AgentHub Perpl state stream.</p>
                  <div className="status-data">
                    <div><span className="muted">Balance</span><strong>{data.state.account ? text(data.state.account, ["balance"]) : "—"}</strong></div>
                    <div><span className="muted">Locked balance</span><strong>{data.state.account ? text(data.state.account, ["lockedBalance", "locked_balance"]) : "—"}</strong></div>
                    <div><span className="muted">Open orders</span><strong>{orders.length}</strong></div>
                    <div><span className="muted">Open positions</span><strong>{positions.length}</strong></div>
                  </div>
                </section>
              )}

              {mode === "pnl" && (
                <section className="status-panel">
                  <h2>Position PnL</h2>
                  {pnlRows.length === 0 ? <p className="muted">No PnL field is currently available from the live Perpl position state.</p> : pnlRows.map((row, index) => (
                    <div className="agent-row" key={text(row, ["id", "position_id"]) !== "—" ? text(row, ["id", "position_id"]) : index}>
                      <div><strong>{text(row, ["symbol", "market", "instrument"])}</strong><p className="muted">Size {text(row, ["size", "quantity", "qty"])}</p></div>
                      <strong>{number(row, ["pnl", "unrealizedPnl", "unrealized_pnl", "pnlUsd", "pnl_usd"]) ?? "—"}</strong>
                    </div>
                  ))}
                </section>
              )}

              {(mode === "history" || mode === "buys" || mode === "sells") && (
                <section className="status-panel">
                  <h2>{mode === "history" ? "Current activity" : mode === "buys" ? "Buy orders" : "Sell orders"}</h2>
                  <p className="muted">Showing activity currently available in the live Perpl state feed.</p>
                  {(mode === "history" ? orders : filteredOrders).length === 0 ? <p className="muted">No matching orders are currently available.</p> : (mode === "history" ? orders : filteredOrders).map((row, index) => (
                    <div className="agent-row" key={text(row, ["oid", "id"]) !== "—" ? text(row, ["oid", "id"]) : index}>
                      <div><strong>{text(row, ["symbol", "market", "instrument"])}</strong><p className="muted">{text(row, ["side", "direction"])} · {text(row, ["status"])} · {text(row, ["price", "limit_price", "limitPrice"])}</p></div>
                      <strong>{text(row, ["size", "quantity", "qty"])}</strong>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </DashboardGate>
  );
}
