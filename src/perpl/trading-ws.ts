import { randomBytes } from "node:crypto";
import * as ed from "@noble/ed25519";
import WebSocket from "ws";
import type { PerplOrderRequest, PerplWsMessage } from "./types.js";

const WS_URL = process.env.PERPL_WS_URL ?? "wss://app.perpl.xyz";
const CHAIN_ID = Number(process.env.PERPL_CHAIN_ID ?? 143);

export interface PerplTradingCredentials { apiKey: string; privateKey: Uint8Array }
export interface PlaceOrderInput extends Omit<PerplOrderRequest, "mt" | "rq" | "lb" | "sn"> { rq?: number; lb?: number; sn?: number }
export interface PerplOrderResult { rq: number; sn: number; admission?: PerplWsMessage; outcome?: PerplWsMessage }

export class PerplTradingWs {
  private ws?: WebSocket;
  private requestId = 0;
  private sequenceId = 0;
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
  nextRequestId(): number { return ++this.requestId; }
  nextSequenceId(): number { return ++this.sequenceId; }

  async placeOrder(input: PlaceOrderInput): Promise<number> {
    await this.connect();
    const rq = input.rq ?? this.nextRequestId();
    this.requestId = Math.max(this.requestId, rq);
    const sn = input.sn ?? this.nextSequenceId();
    this.ws!.send(JSON.stringify({ ...input, mt: 22, rq, sn, lb: input.lb ?? 0 }));
    return rq;
  }

  async submitOrder(input: PlaceOrderInput, timeoutMs = 10_000): Promise<PerplOrderResult> {
    await this.connect();
    const rq = input.rq ?? this.nextRequestId();
    this.requestId = Math.max(this.requestId, rq);
    const sn = input.sn ?? this.nextSequenceId();
    return new Promise((resolve, reject) => {
      let admission: PerplWsMessage | undefined;
      const timeout = setTimeout(() => { unsubscribe(); reject(new Error("Perpl order response timeout")); }, timeoutMs);
      const unsubscribe = this.onMessage((message) => {
        if (message.mt === 3 && message.cid === sn) {
          admission = message;
          const status = typeof message.status === "object" && message.status ? message.status as Record<string, unknown> : undefined;
          if (status?.code !== 0) { clearTimeout(timeout); unsubscribe(); reject(new Error(typeof status?.error === "string" ? status.error : "Perpl order rejected")); return; }
          return;
        }
        if (message.mt !== 24 || message.rq !== rq) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve({ rq, sn, admission, outcome: message });
      });
      this.ws!.send(JSON.stringify({ ...input, mt: 22, rq, sn, lb: input.lb ?? 0 }));
    });
  }

  async cancelOrder(params: { mkt: number; acc: number; oid: number; lb: number }, timeoutMs = 10_000): Promise<PerplOrderResult> {
    if (!Number.isInteger(params.oid) || params.oid < 0) throw new Error("Invalid order ID");
    return this.submitOrder({ mkt: params.mkt, acc: params.acc, oid: params.oid, t: 5, s: 0, fl: 0, lv: 0, lb: params.lb });
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
