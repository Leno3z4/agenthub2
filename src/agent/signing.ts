import type { Address, WalletClient } from "viem";
import { buildConnectionChallenge, type AgentConnection } from "./connection.js";

export async function signAgentConnection(
  walletClient: WalletClient,
  owner: Address,
  connection: AgentConnection,
): Promise<`0x${string}`> {
  const message = buildConnectionChallenge(connection.id);
  return walletClient.signMessage({ account: owner, message });
}

export function verifyConnectionInput(params: {
  connection: AgentConnection;
  owner: Address;
  delegatedAccount: Address;
  operator: Address;
}) {
  return (
    params.connection.owner.toLowerCase() === params.owner.toLowerCase() &&
    params.connection.delegatedAccount.toLowerCase() === params.delegatedAccount.toLowerCase() &&
    params.connection.operator.toLowerCase() === params.operator.toLowerCase() &&
    params.connection.status === "active"
  );
}
