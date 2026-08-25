"use client";

import { useState } from "react";

export function AgentSelector() {
  const [open, setOpen] = useState(false);

  return (
    <section className="status-panel">
      <div>
        <h2>Agents</h2>
        <p className="panel-note">Manage connected agents and create new agent connections.</p>
      </div>

      <div>
        <button className="action-button" onClick={() => setOpen(!open)}>
          Connected agents
        </button>

        {open && (
          <div className="risk-panel">
            <p>Agent Alpha</p>
            <p className="muted">Perpl · Connected</p>
            <hr />
            <p>Connect another agent</p>
            <p className="muted">Generate a new connection prompt with your account identity.</p>
          </div>
        )}
      </div>
    </section>
  );
}
