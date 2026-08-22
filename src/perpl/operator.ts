import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

export type AgentOperator = {
  account: PrivateKeyAccount;
  privateKey: `0x${string}`;
};

/** Generate the hot operator key used only for delegated trading. */
export function createAgentOperator(): AgentOperator {
  const privateKey = generatePrivateKey();
  return {
    privateKey,
    account: privateKeyToAccount(privateKey),
  };
}
