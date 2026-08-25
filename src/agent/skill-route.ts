import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";

function send(res: ServerResponse, status: number, body: string) {
  res.writeHead(status, {
    "content-type": "text/markdown; charset=utf-8",
    "cache-control": "public, max-age=300",
  });
  res.end(body);
}

export async function handleSkillRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  if (req.method !== "GET" || req.url !== "/skill.md") return false;

  try {
    const skill = await readFile(
      new URL("../../skill.md", import.meta.url),
      "utf8",
    );
    send(res, 200, skill);
  } catch {
    send(res, 500, "AgentHub skill is unavailable.");
  }

  return true;
}
