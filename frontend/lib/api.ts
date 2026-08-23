const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json();
}

export function getAgentStatus(walletAddress: string) {
  return request(`/agent/status/${walletAddress}`);
}

export function getDelegatedAccount(walletAddress: string) {
  return request(`/agent/delegated-account/${walletAddress}`);
}
