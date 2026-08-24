import { useCallback, useEffect, useState } from "react";

export interface PerplDashboardProps { connectionToken: string; }
type State = { status: string; trading_available: boolean; identity_id: string; agent_id: string; connection_id: string | null; delegated_account: string; account: Record<string, unknown> | null; orders: unknown[]; positions: unknown[]; stale: boolean; sequence_gap: boolean; kill_switch_enabled?: boolean };

async function request<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Request failed");
  return data as T;
}

function short(value: string | null | undefined) { if (!value) return "—"; return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-8)}` : value; }

export function PerplDashboard({ connectionToken }: PerplDashboardProps) {
  const [state, setState] = useState<State>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true); setError(undefined);
    try { setState(await request<State>(connectionToken, "/api/agent/perpl/state")); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load Perpl state"); }
    finally { setLoading(false); }
  }, [connectionToken]);

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 10_000); return () => window.clearInterval(timer); }, [refresh]);

  async function killSwitch(enabled: boolean) {
    setBusy(true); setError(undefined);
    try { await request(connectionToken, "/api/agent/perpl/kill-switch", { method: "POST", body: JSON.stringify({ enabled }) }); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Kill switch request failed"); }
    finally { setBusy(false); }
  }

  if (loading && !state) return <section className="card"><div className="eyebrow">Perpl</div><h2>Loading account…</h2></section>;

  const healthy = state?.status === "connected" && state.trading_available;
  const active = state?.kill_switch_enabled === true;
  return <section className="card">
    <div className="eyebrow">Perpl / Trading account</div>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
      <div><h2>Account overview</h2><p>{short(state?.delegated_account)}</p></div>
      <strong aria-label="connection status">{active ? "EMERGENCY HALT" : healthy ? "CONNECTED" : String(state?.status ?? "UNKNOWN").toUpperCase()}</strong>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 20 }}>
      <div><small>Orders</small><div>{state?.orders?.length ?? 0}</div></div>
      <div><small>Positions</small><div>{state?.positions?.length ?? 0}</div></div>
      <div><small>Identity</small><div>{short(state?.identity_id)}</div></div>
    </div>
    {error && <p role="alert">{error}</p>}
    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
      <button className="btn" onClick={() => void refresh()} disabled={loading || busy}>Refresh</button>
      <button className="btn" onClick={() => void killSwitch(!active)} disabled={busy || !healthy}>{busy ? "Working…" : active ? "Resume trading" : "Emergency close & halt"}</button>
    </div>
    <p><small>Connection: {short(state?.connection_id)} · State: {state?.stale ? "stale" : state?.sequence_gap ? "sequence gap" : "fresh"}</small></p>
  </section>;
}
