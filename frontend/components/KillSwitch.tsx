"use client";

import { useState } from "react";

export function KillSwitch() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="kill-switch"
        onClick={() => setOpen(true)}
      >
        EMERGENCY CLOSE
      </button>

      {open && (
        <div className="modal-backdrop">
          <div className="kill-modal">
            <div className="eyebrow">EMERGENCY ACTION</div>

            <h2>Close all positions?</h2>

            <p>
              This will instruct the backend to close every supported
              open position belonging to this agent.
            </p>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>

              <button className="confirm-kill">
                Close all positions
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
