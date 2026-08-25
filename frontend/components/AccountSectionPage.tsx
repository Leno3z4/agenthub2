"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardGate } from "./DashboardGate";
import { DashboardNavigation } from "./DashboardNavigation";
import { getAccountState, type AccountState } from "../lib/api";

const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

type Props = {
  title: string;
  description: string;
};

function value(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const current = item[key];
    if (typeof current === "string" && current) return current;
    if (typeof current === "number") return String(current);
  }
  return "";
}

function isBuy(item: Record<string, unknown>): boolean {
  const side = value(item, ["side", "direction", "s"]).toLowerCase();
  return side.includes("buy") || side.includes("long");
}

export function AccountSectionPage({ title, description }: Props) {
  const [data, setData] = useState<AccountState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);
      if (!accessKey) return;

      try {
        const result = await getAccountState(accessKey);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load account data.",
          );
        }
      }
    }

    load();
    const timer = window.setInterval(load, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const orders = data?.state.orders ?? [];
  const positions = data?.state.positions ?? [];
  const filteredOrders = useMemo(() => {
    if (title === "Buys") return orders.filter(isBuy);
    if (title === "Sells") return orders.filter((item) => !isBuy(item));
    return orders;
  }, [orders, title]);

  const pnl = positions.reduce((total, position) => {
    const raw = value(position, [
      "pnl",
      "unrealizedPnl",
      "unrealized_pnl",
      "upnl",
      "realizedPnl",
      "realized_pnl",
    ]);
    const number = Number(raw);
    return Number.isFinite(number) ? total + number : total;
  }, 0);

  const content =
    title === "PnL" ? (
      <div className="status-data">
        <div>
          <span>OPEN POSITIONS</span>
          <strong>{positions.length}</strong>
        </div>
        <div>
          <span>VISIBLE PNL</span>
          <strong>{pnl.toFixed(4)}</strong>
        </div>
        <div>
          <span>ACCOUNT STATE</span>
          <strong>{data?.state.stale ? "Stale" : "Live"}</strong>
        </div>
      </div>
    ) : (
      <div className="position-list">
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <strong>No {title.toLowerCase()} activity</strong>
            <span>No matching live orders are available.</span>
          </div>
        ) : (
          filteredOrders.map((order, index) => (
            <div className="position-row" key={String(order.id ?? index)}>
              <strong>
                {value(order, ["symbol", "market", "pair", "id"]) ||
                  "Order"}
              </strong>
              <span>
                {value(order, ["side", "direction", "status"]) || "Order"}
              </span>
              <span>
                {value(order, ["size", "quantity", "amount"]) || ""}
              </span>
            </div>
          ))
        )}
      </div>
    );

  return (
    <DashboardGate>
      <main className="dashboard">
        <header className="dashboard-nav">
          <DashboardNavigation />
          <span className="wallet-address">
            {data?.owner
              ? `${data.owner.slice(0, 6)}...${data.owner.slice(-4)}`
              : "Connected wallet"}
          </span>
        </header>

        <div className="dashboard-container">
          <Link className="muted" href="/dashboard">
            Back to dashboard
          </Link>

          <div className="dashboard-heading">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <section className="status-panel">
            {error ? (
              <div className="empty-state">
                <strong>Unable to load account data</strong>
                <span>{error}</span>
              </div>
            ) : !data ? (
              <div className="empty-state">
                <strong>Loading account data</strong>
                <span>Fetching the latest state from AgentHub.</span>
              </div>
            ) : (
              content
            )}
          </section>
        </div>
      </main>
    </DashboardGate>
  );
}
