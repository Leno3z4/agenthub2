import { randomBytes } from "node:crypto";
import * as ed from "@noble/ed25519";
import WebSocket from "ws";
import type { PerplOrderRequest, PerplWsMessage } from "./types.js";

const WS_URL = process.env.PERPL_WS_URL ?? "wss://app.perpl.xyz";
const CHAIN_ID = Number(process.env.PERPL_CHAIN_ID ?? 143);

export interface PerplTradingCredentials { apiKey: string; privateKey: Uint8Array }
export interface PlaceOrderInput extends Omit<PerplOrderRequest, "mt" | "rq" | "lb"> { rq?: number; lb?: number }

export class PerplTradingWs {
  private ws?: WebSocket;
  private requestId = 0;
  private listeners = new Set<(message: PerplWsMessage) => void>();
  constructor(private readonly credentials: PerplTradingCredentials) {}
  isOpen(): boolean { return this.ws?.readyState === WebSocket.OPEN; }

  async connect(): Promise<void> {
    if (this.isOpen()) return;
    this.ws = new WebSocket(`${WS_URL}/ws/v1/trading`);
    await new Promise<void>((resolve, reject) => {
      const ws = this.ws!;
      const timeout = setTimeout(() => reject(new Error("Perpl trading WS connection timeout")), 5000);
      ws.once("open", () => { clearTimeout(timeout); void this.signIn().then(resolve, reject); });
      ws.once("error", reject);
      ws.on("message", (raw) => {
        let message: PerplWsMessage;
        try { message = JSON.parse(raw.toString()) as PerplWsMessage; } catch { return; }
        for (const listener of this.listeners) listener(message);
      });
      ws.on("close", () => { this.ws = undefined; });
    });
  }

  onMessage(listener: (message: PerplWsMessage) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  async placeOrder(input: PlaceOrderInput): Promise<number> {
    await this.connect();
    const rq = input.rq ?? ++this.requestId;
    this.requestId = Math.max(this.requestId, rq);
    this.ws!.send(JSON.stringify({ ...input, mt: 22, rq, lb: input.lb ?? 0 }));
    return rq;
  }

  async placeOrderAndWait(input: PlaceOrderInput, timeoutMs = 8_000): Promise<{ rq: number; response?: PerplWsMessage }> {
    await this.connect();
    const rq = input.rq ?? ++this.requestId;
    this.requestId = Math.max(this.requestId, rq);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { unsubscribe(); reject(new Error("Perpl order response timeout")); }, timeoutMs);
      const unsubscribe = this.onMessage((message) => {
        if (message.rq !== rq) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve({ rq, response: message });
      });
      this.ws!.send(JSON.stringify({ ...input, mt: 22, rq, lb: input.lb ?? 0 }));
    });
  }

  async subscribe(streams: string[]): Promise<void> {
    await this.connect();
    this.ws!.send(JSON.stringify({ mt: 5, subs: streams.map((stream) => ({ stream, subscribe: true })) }));
  }

  close(): void { this.ws?.close(); this.ws = undefined; }

  private async signIn(): Promise<void> {
    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString("base64url");
    const canonical = [CHAIN_ID, "trading-ws-signin", timestamp, nonce].join("\n");
    const signature = await ed.signAsync(Buffer.from(canonical), this.credentials.privateKey);
    this.ws!.send(JSON.stringify({ mt: 29, chain_id: CHAIN_ID, api_key: this.credentials.apiKey, timestamp, nonce, signature: Buffer.from(signature).toString("base64url") }));
  }
}
