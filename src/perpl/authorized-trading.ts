import type { Address } from "viem";
import { assertTradeAllowed, type AgentAuthorization } from "../agent/permissions.js";
import { PerplTradingWs, type PerplTradingCredentials, type PlaceOrderInput } from "./trading-ws.js";

export interface AuthorizedOrderInput extends PlaceOrderInput {
  agentId: string;
  owner: Address;
  delegatedAccount: Address;
  leverage: number;
}

export async function placeAuthorizedOrder(params: { credentials: PerplTradingCredentials; order: AuthorizedOrderInput }): Promise<AgentAuthorization> {
  const { agentId, owner, delegatedAccount, leverage, ...order } = params.order;
  const authorization = assertTradeAllowed({ agentId, owner, delegatedAccount, leverage });
  if (order.lv !== leverage) throw new Error("Order leverage does not match authorized leverage");
  const trading = new PerplTradingWs(params.credentials);
  try { await trading.placeOrder(order); return authorization; }
  finally { trading.close(); }
}
