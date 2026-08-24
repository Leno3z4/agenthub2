import type { IncomingMessage, ServerResponse } from "node:http";
import type { Address, PublicClient } from "viem";
import { authenticateAgent } from "../agent/auth.js";
import { getPerplAccountState } from "./account-state.js";

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}
function bearer(req: IncomingMessage) {
  const value = req.headers.authorization;
  return typeof value === "string" && value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export async function handlePerplAccountRoute(
  req: IncomingMessage,
  res: ServerResponse,
  publicClient: PublicClient,
): Promise<boolean> {
  if (req.method !== "GET" || req.url !== "/api/agent/perpl/account") return false;
  const token = bearer(req);
  if (!token) { json(res, 401, { error: "Agent credential required" }); return true; }
  try {
    const credential = await authenticateAgent(token);
    const state = await getPerplAccountState({
      identityId: credential.identityId,
      delegatedAccount: credential.delegatedAccount as Address,
      publicClient,
    });
    return json(res, 200, state) as unknown as true;
  } catch {
    json(res, 409, { error: "Perpl account is not connected" });
    return true;
  }
}
