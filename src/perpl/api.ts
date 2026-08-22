import type { PerplContext } from "./types.js";

const API_URL = process.env.PERPL_API_URL ?? "https://app.perpl.xyz/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) throw new Error(`Perpl API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export function getPerplContext(): Promise<PerplContext> {
  return request<PerplContext>("/v1/pub/context");
}

export async function getMarket(marketId: number) {
  const market = (await getPerplContext()).markets.find((item) => item.id === marketId);
  if (!market) throw new Error(`Unknown Perpl market: ${marketId}`);
  return market;
}
