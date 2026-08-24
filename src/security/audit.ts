import type { Address } from "viem";
import { getDb } from "../db/client.js";

export async function recordAuditEvent(input: {
  identityId?: string;
  agentId?: string;
  connectionId?: string;
  action: string;
  outcome: "success" | "failure" | "blocked";
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  await getDb().query(
    "INSERT INTO audit_events (identity_id, agent_id, connection_id, action, outcome, request_id, ip_address, user_agent, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7::inet,$8,$9::jsonb)",
    [input.identityId ?? null, input.agentId ?? null, input.connectionId ?? null, input.action, input.outcome, input.requestId ?? null, input.ipAddress ?? null, input.userAgent ?? null, JSON.stringify(input.metadata ?? {})],
  );
}

export function safeAddress(value: unknown): Address | undefined {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value) ? value as Address : undefined;
}
