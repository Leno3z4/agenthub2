import type { IncomingMessage, ServerResponse } from "node:http";
import {
  authenticateIdentityAccessKey,
  issueIdentityAccessKey,
} from "./auth.js";
import { findAgentsByIdentity, revokeDbAgent } from "../db/repositories.js";

const DEFAULT_SKILL_URL = "https://agenthub2.onrender.com/skill.md";

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function accessKey(req: IncomingMessage, body: Record<string, unknown>) {
  const authorization = req.headers.authorization;
  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
  ) {
    return authorization.slice(7).trim();
  }

  const value = body.identity_access_key ?? body.master_key;
  return typeof value === "string" ? value.trim() : "";
}

async function authenticate(
  req: IncomingMessage,
  body: Record<string, unknown>,
) {
  const key = accessKey(req, body);
  if (!key) throw new Error("Identity access key required");
  return authenticateIdentityAccessKey(key);
}

export async function handleAgentRoute(
  req: IncomingMessage,
  res: ServerResponse,
  body: Record<string, unknown>,
): Promise<boolean> {
  if (req.method === "GET" && req.url === "/api/agents") {
    try {
      const identity = await authenticate(req, body);
      const agents = await findAgentsByIdentity(identity.id);
      json(res, 200, {
        identity_id: identity.id,
        delegated_account: identity.delegatedAccount,
        agents,
      });
    } catch {
      json(res, 401, { error: "Identity access key required" });
    }
    return true;
  }

  if (req.method === "POST" && req.url === "/api/agents/connect-prompt") {
    try {
      const identity = await authenticate(req, body);
      const masterKey = await issueIdentityAccessKey(identity);
      const skillUrl =
        process.env.AGENTHUB_SKILL_URL ?? DEFAULT_SKILL_URL;
      const prompt = [
        "Connect this agent to my AgentHub account.",
        "",
        `Read the AgentHub skill first: ${skillUrl}`,
        "Follow the skill's connection instructions.",
        "",
        `Master Key: ${masterKey.token}`,
        "",
        "Use the Master Key only to create the agent connection.",
        "After connection, use the returned connection token for AgentHub requests.",
        "Do not expose or log the Master Key.",
      ].join("\n");

      json(res, 200, {
        prompt,
        skill_url: skillUrl,
        expires_at: masterKey.expiresAt,
      });
    } catch {
      json(res, 401, { error: "Identity access key required" });
    }
    return true;
  }

  const revokeMatch = req.url?.match(/^\/api\/agents\/([^/]+)$/);
  if (req.method === "DELETE" && revokeMatch) {
    try {
      const identity = await authenticate(req, body);
      const revoked = await revokeDbAgent(revokeMatch[1], identity.id);
      if (!revoked) {
        json(res, 404, { error: "Agent not found" });
      } else {
        json(res, 200, {
          revoked: true,
          agent_id: revokeMatch[1],
        });
      }
    } catch {
      json(res, 401, { error: "Identity access key required" });
    }
    return true;
  }

  return false;
}
