import type { Address, PublicClient } from "viem";
import { getPerplAccountId } from "./account.js";

export async function getPerplAccountState(params: {
  identityId: string;
  delegatedAccount: Address;
  publicClient: PublicClient;
}) {
  const exchange = process.env.PERPL_EXCHANGE_ADDRESS as Address | undefined;
  if (!exchange) throw new Error("Perpl exchange is not configured");

  // Account lookup is deliberately read-only. The dashboard needs this
  // information before the user funds the delegated account or connects a
  // Perpl API-key trading session.
  const accountId = await getPerplAccountId(params.publicClient, params.delegatedAccount, exchange);

  return {
    connected: true,
    connector: "perpl" as const,
    delegatedAccount: params.delegatedAccount,
    perplAccountId: accountId.toString(),
    perplAccountInitialized: accountId !== 0n,
  };
}
