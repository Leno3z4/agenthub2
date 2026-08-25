const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://agenthub2.onrender.com";

export type AccountState = {
  identity_id: string;
  owner: string;
  delegatedAccount?: string;
  perplAccountId?: string;
  sessionOpen?: boolean;
  connected?: boolean;
  connector?: string;
  state: {
    account: Record<string, unknown> | null;
    orders: Record<string, unknown>[];
    positions: Record<string, unknown>[];
    stale: boolean;
    sequenceGap: boolean;
    headBlock: number | null;
    lastMessageAt: number | null;
  };
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      body || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}

export function getDelegatedAccount(walletAddress: string) {
  return request<{
    exists: boolean;
    address: string;
  }>(`/api/agent/delegated-account/${walletAddress}`);
}

export function getAccountState(accessKey: string) {
  return request<AccountState>("/api/account/state", {
    headers: {
      Authorization: `Bearer ${accessKey}`,
    },
  });
}
