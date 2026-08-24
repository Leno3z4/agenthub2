export interface RateLimitResult { allowed: boolean; remaining: number; retryAfterMs: number }

interface Bucket { start: number; count: number }
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: Math.max(0, max - 1), retryAfterMs: 0 };
  }
  if (current.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, windowMs - (now - current.start)) };
  }
  current.count += 1;
  return { allowed: true, remaining: Math.max(0, max - current.count), retryAfterMs: 0 };
}

export function clientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  const real = headers["x-real-ip"];
  return typeof real === "string" && real ? real.trim() : "unknown";
}
