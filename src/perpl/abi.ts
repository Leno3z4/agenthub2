export const delegatedAccountFactoryAbi = [
  {
    type: "function",
    name: "createAccount",
    stateMutability: "nonpayable",
    inputs: [{ name: "operator", type: "address" }],
    outputs: [{ name: "account", type: "address" }],
  },
  {
    type: "function",
    name: "getAccount",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "account", type: "address" }],
  },
  {
    type: "function",
    name: "createAccountWithConsent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [{ name: "account", type: "address" }],
  },
] as const;

export const delegatedAccountAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "operatorConfigs",
    stateMutability: "view",
    inputs: [{ name: "operator", type: "address" }],
    outputs: [
      { name: "active", type: "bool" },
      { name: "skills", type: "uint256" },
      { name: "maxLeverageHdths", type: "uint16" },
      { name: "strategyId", type: "bytes32" },
    ],
  },
  {
    type: "function",
    name: "configureOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "skills", type: "uint256" },
      { name: "maxLeverageHdths", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setProtocolWhitelisted",
    stateMutability: "nonpayable",
    inputs: [
      { name: "protocol", type: "address" },
      { name: "whitelisted", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setProtocolSelectorsAllowed",
    stateMutability: "nonpayable",
    inputs: [
      { name: "protocol", type: "address" },
      { name: "selectors", type: "bytes4[]" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setTokenWhitelisted",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "whitelisted", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setSpendingLimitFull",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "token", type: "address" },
      { name: "maxAmount", type: "uint128" },
      { name: "periodSeconds", type: "uint32" },
      { name: "maxPerTx", type: "uint128" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "result", type: "bytes" }],
  },
  {
    type: "function",
    name: "withdrawTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
