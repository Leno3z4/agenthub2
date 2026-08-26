"use client";

import { useState } from "react";

const PERPL_URL = "https://app.perpl.xyz";

export function WithdrawPanel() {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  function openPerpl() {
    setMessage("");

    const value = Number(amount);
    if (amount && (!Number.isFinite(value) || value <= 0)) {
      setMessage("Enter a valid withdrawal amount.");
      return;
    }

    if (amount) {
      setMessage(`Your requested amount is ${amount} AUSD. Complete the withdrawal in Perpl.`);
    } else {
      setMessage("Complete the withdrawal in Perpl after opening your account.");
    }

    window.open(PERPL_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">CAPITAL</div>
          <h2>Withdraw</h2>
        </div>
        <span className="asset-tag">AUSD</span>
      </div>

      <label className="field">
        <span>AMOUNT</span>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>

      <button className="action-button" type="button" onClick={openPerpl}>
        Withdraw on Perpl
      </button>

      {message && <p className="panel-note">{message}</p>}

      <p className="panel-note">
        Withdrawals are completed through Perpl. AgentHub does not give the
        trading API permission to move funds out of your account.
      </p>
    </section>
  );
}
