import "dotenv/config";
import { createServer } from "node:http";
import { createPublicClient, http, type Address, type Hex } from "viem";
import { getPerplContext } from "./perpl/api.js";
import { verifyPerplDeployment } from "./perpl/client.js";
import { handlePerplRoute } from "./perpl/routes.js";
import { handlePerplAccountRoute } from "./perpl/account-route.js";
import { handlePerplOrderRoute } from "./perpl/order-route.js";
import { handlePerplCancelRoute } from "./perpl/cancel-route.js";
import { handlePerplStateRoute } from "./perpl/state-route.js";
import { handlePerplKillSwitchRoute } from "./perpl/kill-switch-route.js";
import { checkDelegatedAccount } from "./frontend/delegated-account.js";
import { monad } from "./config.js";
import { handleAgentRoute } from "./agent/routes.js";
import {
  consumeIdentityChallenge,
  getOrCreateIdentity,
  issueIdentityChallenge,
  createAgent,
} from "./agent/identity.js";
import {
  authenticateIdentityAccessKey,
  issueAgentCredential,
  issueIdentityAccessKey,
  revokeIdentityAccessKey,
} from "./agent/auth.js";
import { clientIp, rateLimit } from "./security/rate-limit.js";

const port = Number(process.env.PORT ?? 10000);
const publicClient = createPublicClient({ chain: monad, transport: http() });

function json(res: any, status: number, body: unknown, retryAfterMs = 0) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cache-control": "no-store",
  };
  if (retryAfterMs > 0) {
    headers["retry-after"] = String(Math.ceil(retryAfterMs / 1000));
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function limited(req: any, res: any, scope: string, max: number, windowMs: number): boolean {
  const result = rateLimit(`${scope}:${clientIp(req.headers)}`, max, windowMs);
  if (result.allowed) return false;
  json(res, 429, { error: "Too many requests" }, result.retryAfterMs);
  return true;
}

async function body(req: any): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks);
  if (raw.length > 16_384) throw new Error("Request body too large");
  if (!raw.length) return {};
  const parsed = JSON.parse(raw.toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid JSON body");
  }
  return parsed as Record<string, unknown>;
}

function bearer(req: any): string | undefined {
  const value = req.headers.authorization;
  return typeof value === "string" && value.startsWith("Bearer ")
    ? value.slice(7).trim() || undefined
    : undefined;
}

const server = createServer(async (req, res) => {
  try {
    if (await handlePerplRoute(req, res)) return;
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, { ok: true });
    }
    if (req.url?.startsWith("/api/agents")) {
      if (await handleAgentRoute(req, res, await body(req))) return;
    }
    if (await handlePerplAccountRoute(req, res, publicClient)) return;
    if (await handlePerplStateRoute(req, res)) return;

    if (req.method === "POST" && req.url === "/api/agent/perpl/order") {
      const data = await body(req);
      if (await handlePerplOrderRoute(req, res, publicClient, data)) return;
    }
    if (req.method === "POST" && req.url === "/api/agent/perpl/order/cancel") {
      const data = await body(req);
      if (await handlePerplCancelRoute(req, res, publicClient, data)) return;
    }
    if (req.method === "GET" && req.url === "/api/perpl/context") {
      try {
        return json(res, 200, await getPerplContext());
      } catch {
        return json(res, 502, { error: "Perpl unavailable" });
      }
    }

    if (req.method === "POST" && req.url === "/api/identity/challenge") {
      if (limited(req, res, "identity-challenge", 5, 60_000)) return;
      const data = await body(req);
      const owner = String(data.owner ?? "") as Address;
      if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) {
        return json(res, 400, { error: "Invalid owner address" });
      }
      return json(
        res,
        200,
        await issueIdentityChallenge(owner, await publicClient.getChainId()),
      );
    }

    if (req.method === "POST" && req.url === "/api/identity/access-key") {
      if (limited(req, res, "identity-access", 3, 60_000)) return;
      const data = await body(req);
      const owner = String(data.owner ?? "") as Address;
      const message = String(data.message ?? "");
      const signature = String(data.signature ?? "") as Hex;
      if (!/^0x[a-fA-F0-9]{40}$/.test(owner) || !/^0x[a-fA-F0-9]+$/.test(signature)) {
        return json(res, 400, { error: "Invalid identity authorization request" });
      }
      const delegated = await checkDelegatedAccount(owner, publicClient);
      if (!delegated.exists) {
        return json(res, 409, { error: "Delegated account does not exist" });
      }
      if (!await consumeIdentityChallenge({ owner, message, signature })) {
        return json(res, 401, { error: "Invalid or expired identity authorization" });
      }
      const identity = await getOrCreateIdentity(owner, delegated.address);
      const accessKey = await issueIdentityAccessKey(identity);
      return json(res, 201, {
        identity_id: identity.id,
        owner: identity.owner,
        delegated_account: identity.delegatedAccount,
        access_key: accessKey.token,
        access_key_id: accessKey.id,
        expires_at: accessKey.expiresAt,
      });
    }

    if (req.method === "POST" && req.url === "/api/agent/connect") {
      if (limited(req, res, "agent-connect", 10, 60_000)) return;
      const data = await body(req);
      const accessToken = String(
        data.identity_access_key ?? data.connection_token ?? bearer(req) ?? "",
      );
      if (!accessToken) return json(res, 401, { error: "Identity access key required" });
      const identity = await authenticateIdentityAccessKey(accessToken);
      const agent = await createAgent(identity.id, String(data.agent_name ?? "Agent"));
      const credential = await issueAgentCredential({
        agentId: agent.id,
        identityId: identity.id,
      });
      return json(res, 201, {
        identity_id: identity.id,
        agent_id: agent.id,
        connection_token: credential.token,
        expires_at: credential.expiresAt,
        scopes: credential.scopes,
      });
    }

    if (req.method === "POST" && req.url === "/api/identity/access-key/revoke") {
      if (limited(req, res, "identity-revoke", 5, 60_000)) return;
      const data = await body(req);
      const accessToken = String(data.identity_access_key ?? bearer(req) ?? "");
      if (!accessToken) return json(res, 401, { error: "Identity access key required" });
      const identity = await authenticateIdentityAccessKey(accessToken);
      const id = String(data.access_key_id ?? "");
      if (!id || !await revokeIdentityAccessKey(id, identity.id)) {
        return json(res, 404, { error: "Access key not found" });
      }
      return json(res, 200, { revoked: true, identity_id: identity.id });
    }

    const delegatedMatch = req.url?.match(
      /^\/api\/agent\/delegated-account\/(0x[a-fA-F0-9]{40})$/,
    );
    if (req.method === "GET" && delegatedMatch) {
      try {
        return json(
          res,
          200,
          await checkDelegatedAccount(delegatedMatch[1] as Address, publicClient),
        );
      } catch {
        return json(res, 502, { error: "Unable to check delegated account" });
      }
    }

    return json(res, 404, { error: "Not found" });
  } catch {
    return json(res, 400, { error: "Bad request" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`agenthub2 listening on ${port}`);
});

verifyPerplDeployment()
  .then((deployment) => console.log(JSON.stringify({ deployment })))
  .catch(() => console.error("Perpl deployment check failed"));
