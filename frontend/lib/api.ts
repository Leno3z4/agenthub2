const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://agenthub-g0m8.onrender.com";

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

export function getAgentStatus(walletAddress: string) {
  return request(`/agent/status/${walletAddress}`);
}

export function getDelegatedAccount(walletAddress: string) {
  return request(
    `/agent/delegated-account/${walletAddress}`,
  );
}
