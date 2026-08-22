import { useState } from "react";
import type { Address, PublicClient, WalletClient } from "viem";
import { DashboardDeposit } from "./DashboardDeposit.js";
import { PerplAccountSetup } from "./PerplAccountSetup.js";

export function TradingSetupDashboard({ owner, delegatedAccount, walletClient, publicClient, ausd, decimals = 18 }: { owner: Address; delegatedAccount: Address; walletClient: WalletClient; publicClient: PublicClient; ausd: Address; decimals?: number }) {
  const [depositConfirmed, setDepositConfirmed] = useState(false);
  const [depositAmount, setDepositAmount] = useState<bigint>();

  async function handleDeposited(hash: `0x${string}`) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("AUSD deposit transaction reverted");
    setDepositConfirmed(true);
  }

  return <main className="section">
    <div className="eyebrow">Dashboard / Trading setup</div>
    <h1>Fund your trading account</h1>
    <p>AUSD funding happens after registration. Perpl account creation becomes available only after the deposit is confirmed on-chain.</p>
    {!depositConfirmed ? <DashboardDeposit walletClient={walletClient} owner={owner} delegatedAccount={delegatedAccount} ausd={ausd} decimals={decimals} onDeposited={handleDeposited} /> : depositAmount !== undefined ? <PerplAccountSetup owner={owner} delegatedAccount={delegatedAccount} walletClient={walletClient} publicClient={publicClient} collateralToken={ausd} amount={depositAmount} /> : <p>Deposit confirmed. Continue to Perpl setup.</p>}
  </main>;
}
