import type { Address, PublicClient } from "viem";
import { getPerplAccountId } from "./account.js";
import { getPerplSession } from "./session.js";

export async function getPerplAccountState(params: {
  identityId: string;
  delegatedAccount: Address;
  publicClient: PublicClient;
}) {
  const accountId = await getPerplAccountId(params.publicClient, params.delegatedAccount, process.env.PERPL_EXCHANGE_ADDRESS as Address);
  const session = await getPerplSession(params.identityId);
  return {
    connected: true,
    connector: "perpl" as const,
    delegatedAccount: params.delegatedAccount,
    perplAccountId: accountId.toString(),
    sessionOpen: session.isOpen(),
  };
}
