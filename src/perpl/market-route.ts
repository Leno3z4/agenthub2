import type { IncomingMessage, ServerResponse } from "node:http";
import { authenticateAgent, requireAgentScope } from "../agent/auth.js";
import { getPerplContext } from "./api.js";
import { clientIp, rateLimit } from "../security/rate-limit.js";

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function bearer(req: IncomingMessage) {
  const value = req.headers.authorization;
  return typeof value === "string" && /^Bearer\s+/i.test(value)
    ? value.replace(/^Bearer\s+/i, "").trim()
    : "";
}

export async function handlePerplMarketRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  if (
    req.method !== "GET" ||
    (req.url !== "/api/agent/perpl/markets" &&
      !req.url?.startsWith("/api/agent/perpl/markets/"))
  ) {
    return false;
  }

  const limit = rateLimit(`agent-perpl-markets:${clientIp(req.headers)}`, 60, 60_000);
  if (!limit.allowed) {
    res.setHeader("retry-after", String(Math.ceil(limit.retryAfterMs / 1000)));
    json(res, 429, { error: "Too many requests" });
    return true;
  }

  const token = bearer(req);
  if (!token) {
    json(res, 401, { error: "Agent credential required" });
    return true;
  }

  try {
    const credential = await authenticateAgent(token);
    requireAgentScope(credential, "trade:read");
    const context = await getPerplContext();
    const path = req.url ?? "";

    if (path === "/api/agent/perpl/markets") {
      json(res, 200, {
        chain: context.chain,
        instances: context.instances,
        tokens: context.tokens,
        markets: context.markets,
        source: "perpl-public-context",
      });
      return true;
    }

    const lookup = decodeURIComponent(path.slice("/api/agent/perpl/markets/".length));
    const market = context.markets.find(
      (item) => String(item.id) === lookup || item.symbol.toLowerCase() === lookup.toLowerCase(),
    );
    if (!market) {
      json(res, 404, { error: "Perpl market not found" });
      return true;
    }

    json(res, 200, {
      market,
      source: "perpl-public-context",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Perpl market data unavailable";
    json(res, 502, { error: "Perpl market data unavailable", detail: message });
  }

  return true;
}
