import {
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  encodeFunctionData,
} from "viem";
import {
  INVAIRIANT_FACTORY,
  PERPL_EXCHANGE,
  publicClient,
} from "../config.js";
import { delegatedAccountAbi, delegatedAccountFactoryAbi, erc20Abi } from "./abi.js";

export const SKILL_CAN_TRADE_PERPS = 1n << 4n;
export const SKILL_CAN_LEVERAGE = 1n << 6n;

export type CreateAccountResult = {
  account: Address;
  operator: Address;
  txHash: Hash;
};

export async function getDelegatedAccount(owner: Address, client: PublicClient = publicClient) {
  const account = await client.readContract({
    address: INVAIRIANT_FACTORY,
    abi: delegatedAccountFactoryAbi,
    functionName: "getAccount",
    args: [owner],
  });

  return account as Address;
}

/**
 * Deploy the user's InvAIriant smart account. The connected wallet remains owner.
 * The operator is a separate hot wallet and never receives custody of the funds.
 */
export async function createDelegatedAccount(
  walletClient: WalletClient,
  owner: Address,
  operator: Address,
): Promise<CreateAccountResult> {
  const chainId = await publicClient.getChainId();
  if (chainId !== 143) throw new Error(`Wrong chain: expected Monad (143), got ${chainId}`);

  const hash = await walletClient.writeContract({
    account: owner,
    address: INVAIRIANT_FACTORY,
    abi: delegatedAccountFactoryAbi,
    functionName: "createAccount",
    args: [operator],
    chain: walletClient.chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Delegated account creation failed");

  const account = await getDelegatedAccount(owner);
  if (account === "0x0000000000000000000000000000000000000000") {
    throw new Error("Factory did not register the delegated account");
  }

  return { account, operator, txHash: hash };
}

export async function configurePerplOperator(
  walletClient: WalletClient,
  owner: Address,
  delegatedAccount: Address,
  operator: Address,
  maxLeverageX100: number,
) {
  const skills = SKILL_CAN_TRADE_PERPS | SKILL_CAN_LEVERAGE;
  return walletClient.writeContract({
    account: owner,
    address: delegatedAccount,
    abi: delegatedAccountAbi,
    functionName: "configureOperator",
    args: [operator, skills, maxLeverageX100],
    chain: walletClient.chain,
  });
}

export async function whitelistPerpl(
  walletClient: WalletClient,
  owner: Address,
  delegatedAccount: Address,
  selectors: `0x${string}`[],
) {
  const protocolTx = await walletClient.writeContract({
    account: owner,
    address: delegatedAccount,
    abi: delegatedAccountAbi,
    functionName: "setProtocolWhitelisted",
    args: [PERPL_EXCHANGE, true],
    chain: walletClient.chain,
  });

  const selectorTx = await walletClient.writeContract({
    account: owner,
    address: delegatedAccount,
    abi: delegatedAccountAbi,
    functionName: "setProtocolSelectorsAllowed",
    args: [PERPL_EXCHANGE, selectors, true],
    chain: walletClient.chain,
  });

  return { protocolTx, selectorTx };
}

export async function whitelistToken(
  walletClient: WalletClient,
  owner: Address,
  delegatedAccount: Address,
  token: Address,
) {
  return walletClient.writeContract({
    account: owner,
    address: delegatedAccount,
    abi: delegatedAccountAbi,
    functionName: "setTokenWhitelisted",
    args: [token, true],
    chain: walletClient.chain,
  });
}

export async function setTradingSpendingLimit(
  walletClient: WalletClient,
  owner: Address,
  delegatedAccount: Address,
  operator: Address,
  token: Address,
  maxAmount: bigint,
  periodSeconds: number,
  maxPerTx: bigint,
) {
  return walletClient.writeContract({
    account: owner,
    address: delegatedAccount,
    abi: delegatedAccountAbi,
    functionName: "setSpendingLimitFull",
    args: [operator, token, maxAmount, periodSeconds, maxPerTx],
    chain: walletClient.chain,
  });
}

export function encodePerplExecution(data: `0x${string}`) {
  return encodeFunctionData({
    abi: delegatedAccountAbi,
    functionName: "execute",
    args: [PERPL_EXCHANGE, data],
  });
}

export function encodeTokenTransfer(token: Address, to: Address, amount: bigint) {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
  });
}
