export const factoryAbi = [
  { type: "function", name: "createAccount", stateMutability: "nonpayable", inputs: [], outputs: [{ name: "account", type: "address" }] },
  { type: "function", name: "getAccount", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "account", type: "address" }] },
] as const;

export const accountAbi = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "operator", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "execute", stateMutability: "payable", inputs: [{ name: "target", type: "address" }, { name: "value", type: "uint256" }, { name: "data", type: "bytes" }], outputs: [{ type: "bytes" }] },
] as const;
