export const factoryAbi = [
  { type: "function", name: "createAccount", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }], outputs: [{ name: "account", type: "address" }] },
  { type: "function", name: "getAccount", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "account", type: "address" }] },
] as const;

export const accountAbi = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "execute", stateMutability: "payable", inputs: [{ name: "target", type: "address" }, { name: "data", type: "bytes" }], outputs: [{ type: "bytes" }] },
  { type: "function", name: "setApproval", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "spender", type: "address" }, { name: "amount", type: "uint256" }] },
  { type: "function", name: "setProtocolWhitelisted", stateMutability: "nonpayable", inputs: [{ name: "protocol", type: "address" }, { name: "whitelisted", type: "bool" }] },
  { type: "function", name: "setProtocolSelectorsAllowed", stateMutability: "nonpayable", inputs: [{ name: "protocol", type: "address" }, { name: "selectors", type: "bytes4[]" }, { name: "allowed", type: "bool" }] },
  { type: "function", name: "setTokenWhitelisted", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "whitelisted", type: "bool" }] },
  { type: "function", name: "configureOperator", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "skills", type: "uint256" }, { name: "maxLeverageHdths", type: "uint16" }] },
  { type: "function", name: "setSpendingLimit", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "token", type: "address" }, { name: "maxAmount", type: "uint128" }, { name: "periodSeconds", type: "uint32" }] },
] as const;
