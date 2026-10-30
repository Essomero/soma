declare module "./_limits" {
  interface RateLimitOptions {
    key: string;
    limit?: number;
    windowMs?: number;
  }
  export function rateLimit(req: unknown, res: unknown, opts?: RateLimitOptions): boolean;
}