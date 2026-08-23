"use client";

import { useState } from "react";

export function WalletButton() {
  const [connected, setConnected] = useState(false);

  return (
    <button
      className="wallet-button"
      onClick={() => setConnected((value) => !value)}
    >
      <span className="wallet-dot" />
      {connected ? "Connected" : "Connect wallet"}
    </button>
  );
}
