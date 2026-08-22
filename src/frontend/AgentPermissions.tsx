import { useState } from "react";

export interface TradingPermissions {
  enabled: boolean;
  maxLeverage: number;
  allowWithdrawals: false;
}

export function AgentPermissions({ agentId, delegatedAccount, onSaved }: { agentId: string; delegatedAccount: string; onSaved?: (permissions: TradingPermissions) => void }) {
  const [enabled, setEnabled] = useState(true);
  const [maxLeverage, setMaxLeverage] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  async function save() {
    const leverage = Number(maxLeverage);
    if (!Number.isFinite(leverage) || leverage < 1 || leverage > 50) {
      setError("Maximum leverage must be between 1x and 50x.");
      return;
    }
    setBusy(true); setError(undefined); setSaved(false);
    try {
      const response = await fetch("/api/agent/permissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, delegated_account: delegatedAccount, permissions: { enabled, max_leverage: leverage, allow_withdrawals: false } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not save permissions");
      const permissions = { enabled, maxLeverage: leverage, allowWithdrawals: false as const };
      setSaved(true); onSaved?.(permissions);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save permissions"); }
    finally { setBusy(false); }
  }

  return <section className="card">
    <div className="eyebrow">Agent / Permissions</div>
    <h2>Trading permissions</h2>
    <p>Limit this agent to perpetual trading. Withdrawals are permanently disabled for this authorization.</p>
    <label><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enable trading</label>
    <label>Maximum leverage <input type="number" min="1" max="50" step="1" value={maxLeverage} onChange={(e) => setMaxLeverage(e.target.value)} />x</label>
    <p>Withdrawals: disabled</p>
    <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save permissions"}</button>
    {saved && <p>Trading permissions saved.</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
