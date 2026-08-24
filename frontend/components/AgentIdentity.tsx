"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getDelegatedAccount } from "../lib/api";

type DelegatedAccountResponse = {
  exists?: boolean;
  address?: string;
  delegated_account?: string;
};

export function AgentIdentity() {
  const { address, isConnected } = useAccount();

  const [account, setAccount] =
    useState<DelegatedAccountResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setAccount(null);
      return;
    }

    const currentAddress = address;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result =
          await getDelegatedAccount(currentAddress);

        if (!cancelled) {
          setAccount(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to check delegated account.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <section className="status-panel">
        <div>
          <div className="panel-label">AGENT IDENTITY</div>
          <h2>Connect your wallet</h2>
          <p className="panel-note">
            Your wallet is used as the AgentHub identity.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="status-panel">
        <div>
          <div className="panel-label">AGENT IDENTITY</div>
          <h2>Checking account...</h2>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="status-panel">
        <div>
          <div className="panel-label">AGENT IDENTITY</div>
          <h2>Unable to check account</h2>
          <p className="panel-note">{error}</p>
        </div>
      </section>
    );
  }

  const delegatedAccount =
    account?.address ||
    account?.delegated_account;

  if (delegatedAccount) {
    return (
      <section className="status-panel">
        <div className="status-main">
          <div className="status-icon">A</div>

          <div>
            <div className="panel-label">
              DELEGATED ACCOUNT
            </div>

            <h2>Account detected</h2>

            <span className="status-live">
              <i />
              READY
            </span>
          </div>
        </div>

        <div className="status-data">
          <div>
            <span>OWNER</span>
            <strong>
              {address?.slice(0, 6)}...
              {address?.slice(-4)}
            </strong>
          </div>

          <div>
            <span>DELEGATED ACCOUNT</span>
            <strong>
              {delegatedAccount.slice(0, 6)}...
              {delegatedAccount.slice(-4)}
            </strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="status-panel">
      <div>
        <div className="panel-label">
          DELEGATED ACCOUNT
        </div>

        <h2>No account found</h2>

        <p className="panel-note">
          This wallet does not have a DelegatedAccount yet.
        </p>
      </div>

      <button className="action-button">
        Create DelegatedAccount
        <span>↗</span>
      </button>
    </section>
  );
}
