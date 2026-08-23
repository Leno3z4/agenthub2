"use client";

import { useState } from "react";

export function DepositPanel() {
  const [amount, setAmount] = useState("");

  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">CAPITAL</div>
          <h2>Fund agent</h2>
        </div>

        <span className="asset-tag">AUSD</span>
      </div>

      <div className="balance">
        <span>AVAILABLE TO DEPOSIT</span>
        <strong>0.00 AUSD</strong>
      </div>

      <label className="field">
        <span>AMOUNT</span>

        <input
          type="number"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>

      <button className="action-button" disabled={!amount}>
        Deposit to agent
        <span>↗</span>
      </button>

      <p className="panel-note">
        Funds are deposited from your connected wallet into the
        agent's delegated trading account.
      </p>
    </section>
  );
}
