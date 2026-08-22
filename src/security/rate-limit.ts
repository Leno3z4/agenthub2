export interface RateLimitResult { allowed: boolean; remaining: number; retryAfterMs: number }

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, { start: number; count: number }>();
  constructor(private readonly max: number, private readonly windowMs: number) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || now - current.start >= this.windowMs) {
      this.buckets.set(key, { start: now, count: 1 });
      return { allowed: true, remaining: this.max - 1, retryAfterMs: 0 };
    }
    if (current.count >= this.max) {
      return { allowed: false, remaining: 0, retryAfterMs: this.windowMs - (now - current.start) };
    }
    current.count += 1;
    return { allowed: true, remaining: this.max - current.count, retryAfterMs: 0 };
  }
}

export const authRateLimiter = new FixedWindowRateLimiter(10, 60_000);
export const tradeRateLimiter = new FixedWindowRateLimiter(30, 60_000);
