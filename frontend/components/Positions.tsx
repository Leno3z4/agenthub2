"use client";

import { useEffect, useState } from "react";
import { getAccountState, type AccountState } from "../lib/api";

const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function positionLabel(position: Record<string, unknown>): string {
  return (
    text(position.symbol) ||
    text(position.market) ||
    text(position.pair) ||
    text(position.id) ||
    "Position"
  );
}

export function Positions() {
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
              : "Unable to load positions.",
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

  const positions = data?.state.positions ?? [];
  const loading = !data && !error;

  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <h2>Open positions</h2>
        </div>

        <span className="position-count">{positions.length}</span>
      </div>

      {error ? (
        <div className="empty-state">
          <strong>Unable to load positions</strong>
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="empty-state">
          <strong>Loading positions</strong>
          <span>Fetching the latest account state.</span>
        </div>
      ) : positions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-mark">0</div>
          <strong>No open positions</strong>
          <span>Your agent has no active positions right now.</span>
        </div>
      ) : (
        <div className="position-list">
          {positions.map((position, index) => (
            <div
              className="position-row"
              key={String(position.id ?? index)}
            >
              <strong>{positionLabel(position)}</strong>
              <span>
                {text(position.side) ||
                  text(position.direction) ||
                  "Open"}
              </span>
              <span>
                {text(position.size) ||
                  text(position.quantity) ||
                  ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
