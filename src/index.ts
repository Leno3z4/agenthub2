import "dotenv/config";
import { createServer } from "node:http";
import { getPerplContext } from "./perpl/api.js";
import { verifyPerplDeployment } from "./perpl/client.js";

const port = Number(process.env.PORT ?? 10000);

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "GET" && req.url === "/api/perpl/context") {
    try {
      const context = await getPerplContext();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(context));
    } catch (error) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Perpl unavailable" }));
    }
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, "0.0.0.0", () => console.log(`agenthub2 listening on ${port}`));

verifyPerplDeployment()
  .then((deployment) => console.log(JSON.stringify({ deployment })))
  .catch((error) => console.error("Perpl deployment check failed:", error));
