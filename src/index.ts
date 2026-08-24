import "dotenv/config";
import { createServer } from "node:http";
import { createPublicClient, http, type Address, type Hex } from "viem";
import { getPerplContext } from "./perpl/api.js";
import { verifyPerplDeployment } from "./perpl/client.js";
import { checkDelegatedAccount } from "./frontend/delegated-account.js";
import { monad } from "./config.js";
import { consumeIdentityChallenge, getIdentityByOwner, getOrCreateIdentity, issueIdentityChallenge, createAgent } from "./agent/identity.js";
import { authenticateIdentityAccessKey, issueAgentCredential, revokeIdentityAccessKey } from "./agent/auth.js";

const port = Number(process.env.PORT ?? 10000);
const publicClient = createPublicClient({ chain: monad, transport: http() });

function json(res: any, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function body(req: any): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (Buffer.concat(chunks).length > 16_384) throw new Error("Request body too large");
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON body");
  return parsed as Record<string, unknown>;
}

function bearer(req: any): string | undefined {
  const value = req.headers.authorization;
  if (typeof value !== "string" || !value.startsWith("Bearer ")) return undefined;
  return value.slice(7).trim() || undefined;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") return json(res, 200, { ok: true });

    if (req.method === "GET" && req.url === "/api/perpl/context") {
      try { return json(res, 200, await getPerplContext()); }
      catch (error) { return json(res, 502, { error: error instanceof Error ? error.message : "Perpl unavailable" }); }
    }

    if (req.method === "POST" && req.url === "/api/identity/challenge") {
      const data = await body(req);
      const owner = String(data.owner ?? "") as Address;
      if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) return json(res, 400, { error: "Invalid owner address" });
      return json(res, 200, issueIdentityChallenge(owner, await publicClient.getChainId()));
    }

    if (req.method === "POST" && req.url === "/api/identity/access-key") {
      const data = await body(req);
      const owner = String(data.owner ?? "") as Address;
      const message = String(data.message ?? "");
      const signature = String(data.signature ?? "") as Hex;
      const delegated = await checkDelegatedAccount(owner, publicClient);
      if (!delegated.exists) return json(res, 409, { error: "Delegated account does not exist" });
      const valid = await consumeIdentityChallenge({ owner, message, signature });
      if (!valid) return json(res, 401, { error: "Invalid or expired identity authorization" });
      const identity = getOrCreateIdentity(owner, delegated.address);
      const accessKey = issueAgentAccessKey(identity);
      return json(res, 201, { identity_id: identity.id, owner: identity.owner, delegated_account: identity.delegatedAccount, access_key: accessKey.token, access_key_id: accessKey.id, expires_at: accessKey.expiresAt });
    }

    if (req.method === "POST" && req.url === "/api/agent/connect") {
      const data = await body(req);
      const accessToken = String(data.identity_access_key ?? data.connection_token ?? bearer(req) ?? "");
      if (!accessToken) return json(res, 401, { error: "Identity access key required" });
      const identity = authenticateIdentityAccessKey(accessToken);
      const agent = createAgent(identity.id, String(data.agent_name ?? "Agent"));
      const credential = issueAgentCredential({ agentId: agent.id, identityId: identity.id });
      return json(res, 201, { identity_id: identity.id, agent_id: agent.id, connection_token: credential.token, expires_at: credential.expiresAt, scopes: credential.scopes });
    }

    if (req.method === "POST" && req.url === "/api/identity/access-key/revoke") {
      const data = await body(req);
      const accessToken = String(data.identity_access_key ?? bearer(req) ?? "");
      if (!accessToken) return json(res, 401, { error: "Identity access key required" });
      authenticateIdentityAccessKey(accessToken);
      const id = String(data.access_key_id ?? "");
      if (!id || !revokeIdentityAccessKey(id)) return json(res, 404, { error: "Access key not found" });
      return json(res, 200, { revoked: true });
    }

    const delegatedMatch = req.url?.match(/^\/api\/agent\/delegated-account\/(0x[a-fA-F0-9]{40})$/);
    if (req.method === "GET" && delegatedMatch) {
      try { return json(res, 200, await checkDelegatedAccount(delegatedMatch[1] as Address, publicClient)); }
      catch (error) { return json(res, 502, { error: error instanceof Error ? error.message : "Unable to check delegated account" }); }
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Bad request" });
  }
});

function issueAgentAccessKey(identity: Parameters<typeof getOrCreateIdentity>[0] extends never ? never : ReturnType<typeof getOrCreateIdentity>) {
  const { issueIdentityAccessKey } = require("./agent/auth.js") as typeof import("./agent/auth.js");
  return issueIdentityAccessKey(identity);
}

server.listen(port, "0.0.0.0", () => console.log(`agenthub2 listening on ${port}`));
verifyPerplDeployment().then((deployment) => console.log(JSON.stringify({ deployment }))).catch((error) => console.error("Perpl deployment check failed:", error));
