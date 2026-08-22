export type PerplOrderType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type PerplOrderFlags = 0 | 1 | 2 | 4;

export interface PerplOrderRequest {
  mt: 22;
  rq: number;
  mkt: number;
  acc: number;
  oid?: number;
  t: PerplOrderType;
  p?: number;
  s: number;
  ms?: number;
  tif?: number;
  fl: PerplOrderFlags;
  tp?: number;
  tpc?: number;
  lp?: number;
  lv: number;
  lb: number;
}

export interface PerplContext {
  chain: {
    chain_id: number;
    name?: string;
    rpc_urls?: string[];
  };
  instances: Array<{
    id: number;
    address: string;
    collateral_token_id: number;
  }>;
  tokens: Array<{
    id?: number;
    address?: string;
    symbol: string;
    decimals: number;
  }>;
  markets: Array<{
    id: number;
    instance_id: number;
    perpetual_id: number;
    symbol: string;
    name: string;
    config: {
      is_open: boolean;
      price_decimals: number;
      size_decimals: number;
      order_max_market_slippage_bps: number;
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
