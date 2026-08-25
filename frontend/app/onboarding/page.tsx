"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useSignMessage,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { WalletConnect } from "../../components/WalletConnect";
import { AgentConnectionChecker } from "../../components/AgentConnectionChecker";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://agenthub2.onrender.com";
const ACCESS_KEY_STORAGE = "agenthub_identity_access_key";
const FACTORY =
  "0xb54B83513519Ec64e579F8F1CDdeaEF1CF4BB71b" as `0x${string}`;
const ZERO = "0x0000000000000000000000000000000000000000";

const FACTORY_ABI = [
  {
    type: "function",
    name: "getAccount",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "account", type: "address" }],
  },
  {
    type: "function",
    name: "createAccount",
    stateMutability: "nonpayable",
    inputs: [{ name: "operator", type: "address" }],
    outputs: [{ name: "account", type: "address" }],
  },
] as const;

export default function OnboardingPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const {
    writeContract,
    data: createHash,
    isPending: creating,
    error: createError,
  } = useWriteContract();
  const {
    isLoading: confirming,
    isSuccess: accountCreated,
  } = useWaitForTransactionReceipt({ hash: createHash });
  const { data: delegated, refetch: refetchDelegated } = useReadContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: "getAccount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<
    "wallet" | "risk" | "account" | "agent"
  >("wallet");
  const [connectionPrompt, setConnectionPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const existingAccount = Boolean(delegated && delegated !== ZERO);
  const accountAddress = existingAccount ? String(delegated) : "";

  async function finishAccountCreation() {
    await refetchDelegated();
    setStep("agent");
  }

  async function authorizeIdentity() {
    if (!address) {
      return;
    }

    setError("");

    try {
      const challengeResponse = await fetch(
        `${API_URL}/api/identity/challenge`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ owner: address }),
        },
      );
      const challenge = await challengeResponse.json();

      if (!challengeResponse.ok) {
        throw new Error(
          challenge.error ?? "Unable to start identity authorization",
        );
      }

      const signature = await signMessageAsync({ message: challenge.message });
      const response = await fetch(`${API_URL}/api/identity/access-key`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner: address,
          message: challenge.message,
          signature,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Identity authorization failed");
      }

      const accessKey = body.access_key;
      window.localStorage.setItem(ACCESS_KEY_STORAGE, accessKey);

      const promptResponse = await fetch(
        `${API_URL}/api/agents/connect-prompt`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${accessKey}`,
          },
          body: JSON.stringify({}),
        },
      );
      const promptBody = await promptResponse.json();

      if (!promptResponse.ok) {
        throw new Error(
          promptBody.error ?? "Unable to create the agent connection prompt",
        );
      }

      setConnectionPrompt(promptBody.prompt);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Identity authorization failed",
      );
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(connectionPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        {step === "wallet" && (
          <>
            <h1>Connect your wallet</h1>
            <p>
              Your wallet establishes ownership of your AgentHub identity. It
              is never given to your agent.
            </p>
            <WalletConnect />
            {isConnected && (
              <button
                className="button-primary"
                onClick={() => setStep("risk")}
              >
                Continue
              </button>
            )}
          </>
        )}

        {step === "risk" && (
          <>
            <h1>Understand the risks</h1>
            <p>
              Connected agents can execute trades through your delegated
              trading account.
            </p>
            <div className="risk-panel">
              <p>
                I understand that trading carries risk and that I am
                authorizing an agent to execute supported trading actions
                through my delegated account.
              </p>
            </div>
            <label className="risk-check">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
              />
              <span>I understand and agree.</span>
            </label>
            <button
              className="button-primary"
              disabled={!agreed}
              onClick={() => setStep("account")}
            >
              Continue
            </button>
          </>
        )}

        {step === "account" && (
          <>
            <h1>Create your agent account</h1>
            <p>
              AgentHub creates a delegated trading account owned by your
              connected wallet. This is the address your agent will operate
              through.
            </p>

            {existingAccount ? (
              <div className="risk-panel">
                <strong>Agent trading account</strong>
                <pre>{accountAddress}</pre>
                <p className="muted">
                  This account is already set up for this wallet.
                </p>
              </div>
            ) : (
              <>
                <p className="muted">
                  No agent trading account was found for this wallet.
                </p>
                <button
                  className="button-primary"
                  disabled={!address || creating || confirming}
                  onClick={() =>
                    writeContract({
                      address: FACTORY,
                      abi: FACTORY_ABI,
                      functionName: "createAccount",
                      args: [address!],
                    })
                  }
                >
                  {creating || confirming
                    ? "Creating account..."
                    : "Create agent account"}
                </button>
                {accountCreated && (
                  <div className="risk-panel">
                    <strong>Account created</strong>
                    <p>
                      The account is ready for agent connection. Funding is
                      handled later from your dashboard.
                    </p>
                  </div>
                )}
              </>
            )}

            {existingAccount && (
              <button
                className="button-primary"
                onClick={() => setStep("agent")}
              >
                Continue
              </button>
            )}
            {accountCreated && (
              <button
                className="button-primary"
                onClick={() => void finishAccountCreation()}
                disabled={confirming}
              >
                Continue to agent setup
              </button>
            )}
            {createError && (
              <p className="error-text">{createError.message}</p>
            )}
          </>
        )}

        {step === "agent" && (
          <>
            <h1>Connect your agent</h1>
            <p>
              Authorize this AgentHub identity, then copy the connection
              prompt into your agent. The backend-generated prompt tells the
              agent where to read the skill and how to exchange your identity
              credential for its own connection token.
            </p>

            {!connectionPrompt ? (
              <button
                className="button-primary"
                onClick={() => void authorizeIdentity()}
              >
                Authorize AgentHub identity
              </button>
            ) : (
              <>
                <div className="risk-panel">
                  <pre>{connectionPrompt}</pre>
                </div>
                <button
                  className="button-primary"
                  onClick={() => void copyPrompt()}
                >
                  {copied ? "Copied" : "Copy connection prompt"}
                </button>
                <AgentConnectionChecker />
                <p className="muted">
                  Keep the identity credential private. Your agent should use
                  the returned connection token for subsequent requests.
                </p>
              </>
            )}

            {error && <p className="error-text">{error}</p>}
          </>
        )}
      </section>
    </main>
  );
}
