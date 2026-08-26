"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { parseUnits } from "viem";

const AUSD: Address = "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://agenthub2.onrender.com";

const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "balance", type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "decimals", type: "uint8" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "success", type: "bool" }] },
] as const;

type AccountState = { delegated_account?: string; delegatedAccount?: string };

export function DepositPanel() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [delegatedAccount, setDelegatedAccount] = useState<Address>();
  const [decimals, setDecimals] = useState(18);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loadingAccount, setLoadingAccount] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!address || !publicClient || !isConnected) return;
      setError("");
      setLoadingAccount(true);
      try {
        const [nextBalance, nextDecimals] = await Promise.all([
          publicClient.readContract({ address: AUSD, abi: ERC20_ABI, functionName: "balanceOf", args: [address] }),
          publicClient.readContract({ address: AUSD, abi: ERC20_ABI, functionName: "decimals" }),
        ]);
        if (!cancelled) {
          setBalance(nextBalance);
          setDecimals(Number(nextDecimals));
        }

        const accessKey = window.localStorage.getItem(ACCESS_KEY_STORAGE);
        if (!accessKey) throw new Error("Connect your AgentHub account first.");
        const response = await fetch(`${API_URL}/api/account/state`, {
          headers: { Authorization: `Bearer ${accessKey}` }, cache: "no-store",
        });
        if (!response.ok) throw new Error("Unable to load the trading account.");
        const account = (await response.json()) as AccountState;
        const target = account.delegated_account || account.delegatedAccount;
        if (!target) throw new Error("Your delegated trading account is not available yet.");
        if (!/^0x[a-fA-F0-9]{40}$/.test(target)) throw new Error("Invalid delegated trading account.");
        if (!cancelled) setDelegatedAccount(target as Address);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load deposit details.");
      } finally {
        if (!cancelled) setLoadingAccount(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [address, isConnected, publicClient]);

  async function deposit() {
    setError("");
    setStatus("");
    if (!address || !isConnected) return setError("Connect your wallet first.");
    if (!delegatedAccount) return setError("Your delegated trading account is not available yet.");
    try {
      const units = parseUnits(amount, decimals);
      if (units <= BigInt(0)) throw new Error("Enter a valid deposit amount.");
      if (units > balance) throw new Error("Insufficient AUSD balance.");
      setStatus("Confirm the deposit in your wallet");
      const hash = await writeContractAsync({ address: AUSD, abi: ERC20_ABI, functionName: "transfer", args: [delegatedAccount, units], account: address });
      setStatus(`Deposit submitted: ${hash}`);
      setAmount("");
      const nextBalance = await publicClient?.readContract({ address: AUSD, abi: ERC20_ABI, functionName: "balanceOf", args: [address] });
      if (nextBalance !== undefined) setBalance(nextBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
      setStatus("");
    }
  }

  const formattedBalance = Number(balance) / 10 ** decimals;
  const disabled = isPending || loadingAccount || !amount || !delegatedAccount;

  return (
    <section className="dashboard-panel">
      <div className="panel-header"><div><div className="panel-label">CAPITAL</div><h2>Fund agent</h2></div><span className="asset-tag">AUSD</span></div>
      <div className="balance"><span>AVAILABLE TO DEPOSIT</span><strong>{formattedBalance.toFixed(2)} AUSD</strong></div>
      <label className="field"><span>AMOUNT</span><input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={isPending} /></label>
      <button className="action-button" disabled={disabled} onClick={deposit}>
        {isPending ? "Confirm in wallet" : loadingAccount ? "Loading account" : "Deposit to agent"}
      </button>
      {status && <p className="panel-note">{status}</p>}
      {error && <p className="panel-note" role="alert">{error}</p>}
      <p className="panel-note">AUSD is transferred from your connected wallet to your delegated trading account.</p>
    </section>
  );
}
