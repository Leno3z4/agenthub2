import { randomBytes } from "node:crypto";
import { createHash } from "node:crypto";
import type { Address, Hex } from "viem";

export interface AgentConnection {
  id: string;
  owner: Address;
  delegatedAccount: Address;
  operator: Address;
  createdAt: string;
  status: "active" | "revoked";
}

export function createConnection(params: {
  owner: Address;
  delegatedAccount: Address;
  operator: Address;
}): AgentConnection {
  const id = createHash("sha256")
    .update(`${params.owner}:${params.delegatedAccount}:${params.operator}:${randomBytes(16).toString("hex")}`)
    .digest("hex");

  return {
    id,
    owner: params.owner,
    delegatedAccount: params.delegatedAccount,
    operator: params.operator,
    createdAt: new Date().toISOString(),
    status: "active",
  };
}

export function buildConnectionChallenge(connectionId: string): string {
  return `Alias Monad agent connection\nConnection: ${connectionId}\nPurpose: authorize this AI agent to trade through the assigned Alias delegated account.\nThis signature does not authorize withdrawals or transfer of collateral.`;
}

export function isConnectionActive(connection: AgentConnection): boolean {
  return connection.status === "active";
}
