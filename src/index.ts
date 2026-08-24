import "dotenv/config";
import { createServer } from "node:http";
import { createPublicClient, http, type Address } from "viem";
import { getPerplContext } from "./perpl/api.js";
import { verifyPerplDeployment } from "./perpl/client.js";
import { checkDelegatedAccount } from "./frontend/delegated-account.js";
import { monad } from "./config.js";

const port = Number(process.env.PORT ?? 10000);

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

function json(res: any, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
  });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && req.url === "/api/perpl/context") {
    try {
      const context = await getPerplContext();
      json(res, 200, context);
    } catch (error) {
      json(res, 502, {
        error:
          error instanceof Error
            ? error.message
            : "Perpl unavailable",
      });
    }
    return;
  }

  const delegatedMatch = req.url?.match(
    /^\/api\/agent\/delegated-account\/(0x[a-fA-F0-9]{40})$/,
  );

  if (req.method === "GET" && delegatedMatch) {
    try {
      const owner = delegatedMatch[1] as Address;

      const result = await checkDelegatedAccount(
        owner,
        publicClient,
      );

      json(res, 200, result);
    } catch (error) {
      json(res, 502, {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check delegated account",
      });
    }

    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(port, "0.0.0.0", () =>
  console.log(`agenthub2 listening on ${port}`),
);

verifyPerplDeployment()
  .then((deployment) =>
    console.log(JSON.stringify({ deployment })),
  )
  .catch((error) =>
    console.error(
      "Perpl deployment check failed:",
      error,
    ),
  );
