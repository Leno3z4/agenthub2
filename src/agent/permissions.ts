import type { Address } from "viem";

export interface TradingPermissions {
  enabled: boolean;
  maxLeverage: number;
  allowWithdrawals: false;
}

export interface AgentAuthorization {
  agentId: string;
  owner: Address;
  delegatedAccount: Address;
  permissions: TradingPermissions;
  updatedAt: string;
}

const authorizations = new Map<string, AgentAuthorization>();

export function setAgentPermissions(input: Omit<AgentAuthorization, "updatedAt">): AgentAuthorization {
  if (!Number.isInteger(input.permissions.maxLeverage) || input.permissions.maxLeverage < 1 || input.permissions.maxLeverage > 50) throw new Error("maxLeverage must be an integer between 1 and 50");
  const authorization = { ...input, permissions: { ...input.permissions, allowWithdrawals: false as const }, updatedAt: new Date().toISOString() };
  authorizations.set(input.agentId, authorization);
  return authorization;
}

export function getAgentPermissions(agentId: string) { return authorizations.get(agentId); }

export function assertTradeAllowed(input: { agentId: string; owner: Address; delegatedAccount: Address; leverage: number }) {
  const authorization = authorizations.get(input.agentId);
  if (!authorization) throw new Error("Agent is not authorized");
  if (!authorization.permissions.enabled) throw new Error("Agent trading is disabled");
  if (authorization.owner.toLowerCase() !== input.owner.toLowerCase()) throw new Error("Agent owner mismatch");
  if (authorization.delegatedAccount.toLowerCase() !== input.delegatedAccount.toLowerCase()) throw new Error("Delegated account mismatch");
  if (!Number.isFinite(input.leverage) || input.leverage < 1 || input.leverage > authorization.permissions.maxLeverage) throw new Error("Leverage exceeds agent permission");
  return authorization;
}

export function assertWithdrawalForbidden(): never { throw new Error("Withdrawals are not permitted for agent authorization"); }
