import type { Address } from "viem";

export const PERPL_API_URL = process.env.PERPL_API_URL ?? "https://app.perpl.xyz/api";
export const PERPL_WS_URL = process.env.PERPL_WS_URL ?? "wss://app.perpl.xyz";
export const PERPL_EXCHANGE: Address = "0x34B6552d57a35a1D042CcAe1951BD1C370112a6F";
export const PERPL_CHAIN_ID = 143;
