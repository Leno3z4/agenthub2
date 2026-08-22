import WebSocket from "ws";
import type { PerplWsMessage } from "./types.js";

const WS_URL = process.env.PERPL_WS_URL ?? "wss://app.perpl.xyz";
const CHAIN_ID = Number(process.env.PERPL_CHAIN_ID ?? 143);

export class PerplMarketDataWs {
  private ws?: WebSocket;
  private listeners = new Set<(message: PerplWsMessage) => void>();

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(`${WS_URL}/ws/v1/market-data`);
    await new Promise<void>((resolve, reject) => {
      const ws = this.ws!;
      const timeout = setTimeout(() => reject(new Error("Perpl market-data WS connection timeout")), 5000);
      ws.once("open", () => { clearTimeout(timeout); resolve(); });
      ws.once("error", reject);
      ws.on("message", (raw) => {
        let message: PerplWsMessage;
        try { message = JSON.parse(raw.toString()) as PerplWsMessage; }
        catch { return; }
        for (const listener of this.listeners) listener(message);
      });
      ws.on("close", () => { this.ws = undefined; });
    });
  }

  onMessage(listener: (message: PerplWsMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async subscribe(streams: string[]): Promise<void> {
    await this.connect();
    this.ws!.send(JSON.stringify({
      mt: 5,
      subs: streams.map((stream) => ({ stream, subscribe: true })),
    }));
  }

  async subscribeMarkets(marketIds: number[]): Promise<void> {
    await this.subscribe([
      `market-state@${CHAIN_ID}`,
      `funding@${CHAIN_ID}`,
      ...marketIds.flatMap((id) => [`order-book@${id}`, `trades@${id}`]),
    ]);
  }

  close(): void {
    this.ws?.close();
    this.ws = undefined;
  }
}
