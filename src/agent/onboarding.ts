import type { Address, WalletClient } from "viem";
import { createAgentOperator, getDelegatedAccount, createDelegatedAccount } from "../invairiant/onboarding.js";
import { createConnection, type AgentConnection } from "./connection.js";
import { signAgentConnection } from "./signing.js";

export async function prepareAgentOnboarding(owner: Address, publicClient: any) {
  const existing = await getDelegatedAccount(owner, publicClient);
  const operator = createAgentOperator();
  return { delegatedAccount: existing as Address, operator: operator.account.address, operatorPrivateKey: operator.privateKey };
}

export async function createAccountAndConnection(walletClient: WalletClient, owner: Address, publicClient: any) {
  let delegatedAccount = await getDelegatedAccount(owner, publicClient) as Address;
  if (!delegatedAccount || delegatedAccount === "0x0000000000000000000000000000000000000000") {
    await createDelegatedAccount(walletClient, owner);
    throw new Error("Delegated account creation submitted. Wait for confirmation, then retry onboarding.");
  }

  const operator = createAgentOperator();
  const connection = createConnection({ owner, delegatedAccount, operator: operator.account.address });
  const signature = await signAgentConnection(walletClient, owner, connection);

  return {
    connection,
    signature,
    operator: operator.account.address,
    operatorPrivateKey: operator.privateKey,
  };
}
