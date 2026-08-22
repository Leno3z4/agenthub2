import { createWalletClient, custom, type Address, type WalletClient } from "viem";
import { monad } from "../config.js";

export async function connectMonadWallet(): Promise<{ address: Address; walletClient: WalletClient }> {
  const provider = (globalThis as any).ethereum;
  if (!provider) throw new Error("No injected wallet found. Install MetaMask or another EVM wallet.");
  const walletClient = createWalletClient({ chain: monad, transport: custom(provider) });
  const [address] = await walletClient.requestAddresses();
  await walletClient.switchChain({ id: monad.id });
  return { address, walletClient };
}
