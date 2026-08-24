const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://agenthub2.onrender.com";

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
  }>(
    `/api/agent/delegated-account/${walletAddress}`,
  );
}
