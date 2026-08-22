export type PerplOrderType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type PerplOrderFlags = 0 | 1 | 2 | 4;

export interface PerplOrderRequest {
  mt: 22;
  sn?: number;
  rq: number;
  mkt: number;
  acc: number;
  oid?: number;
  t: PerplOrderType;
  p?: number;
  s: number;
  a?: string;
  ms?: number;
  tif?: number;
  fl: PerplOrderFlags;
  tp?: number;
  tpc?: number;
  tr?: number;
  lp?: number;
  lv: number;
  lb: number;
  bf?: number;
}

export interface PerplContext {
  chain: { chain_id: number; name?: string; rpc_urls?: string[] };
  instances: Array<{ id: number; address: string; collateral_token_id: number; min_account_open_amount?: string; min_deposit_amount?: string }>;
  tokens: Array<{ id?: number; address?: string; symbol: string; name?: string; decimals: number }>;
  markets: Array<{
    id: number;
    instance_id: number;
    perpetual_id: number;
    symbol: string;
    name: string;
    order_ttl_blocks: number;
    order_retry_blocks: number;
    config: {
      is_open: boolean;
      price_decimals: number;
      size_decimals: number;
      order_max_market_slippage_bps: number;
      maker_fee?: number;
      taker_fee?: number;
    };
    state: {
      bid: number;
      ask: number;
      mid: number;
      mrk: number;
      orl: number;
    };
  }>;
}

export interface PerplWsMessage {
  mt: number;
  sid?: number;
  sn?: number;
  cid?: number;
  ses?: string;
  [key: string]: unknown;
}
