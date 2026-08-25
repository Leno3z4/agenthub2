import type { IncomingMessage, ServerResponse } from "node:http";
import { authenticateIdentityAccessKey, issueAgentCredential, revokeAgentCredential } from "./auth.js";
import { getAgentById, createAgent } from "./identity.js";

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

export async function handleAgentRoute(req: IncomingMessage, res: ServerResponse, body: Record<string, unknown>) {
  if (req.method === "GET" && req.url === "/api/agents") {
    return json(res, 200, { agents: [] });
  }

  if (req.method === "POST" && req.url === "/api/agents/connect-prompt") {
    const key = String(body.identity_access_key ?? "");
    if (!key) return json(res, 401, { error: "Identity access key required" });
    await authenticateIdentityAccessKey(key);
    return json(res, 200, {
      prompt: "Connect this agent to AgentHub. Read the AgentHub skill before connecting.",
      skill_url: "/skill.md",
    });
  }

  return false;
}
