import type { PerplOrderRequest } from "./types.js";

const WS_URL = process.env.PERPL_WS_URL ?? "wss://app.perpl.xyz";

export function createMarketDataSocket(onMessage: (message: unknown) => void): WebSocket {
  const ws = new WebSocket(`${WS_URL}/ws/v1/market-data`);
  ws.addEventListener("message", (event) => onMessage(JSON.parse(String(event.data))));
  return ws;
}

export function subscribeOrderBook(ws: WebSocket, marketId: number) {
  ws.send(JSON.stringify({ mt: 5, subs: [{ stream: `order-book@${marketId}`, subscribe: true }] }));
}

export function createTradingSocket(onMessage: (message: unknown) => void): WebSocket {
  const ws = new WebSocket(`${WS_URL}/ws/v1/trading`);
  ws.addEventListener("message", (event) => onMessage(JSON.parse(String(event.data))));
  return ws;
}

export function sendOrder(ws: WebSocket, order: Omit<PerplOrderRequest, "mt">) {
  ws.send(JSON.stringify({ mt: 22, ...order }));
}
