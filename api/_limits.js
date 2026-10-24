// Shared in-memory rate limiting + client IP helper for /api/* handlers.
// Serverless instances each hold their own map (best-effort friction,
// not a distributed counter). Keeps brute-force and spam cheap to blunt
// without adding a dependency.
const buckets = new Map();

function clientIp(req) {
  const fwd = (req && req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"])) || "";
  const ip = String(fwd).split(",")[0].trim();
  return ip || "unknown";
}

// Returns true when allowed. Otherwise sends 429 and returns false.
export function rateLimit(req, res, { key, limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucketKey = `${key}:${clientIp(req)}`;
  let entry = buckets.get(bucketKey);
  if (!entry || entry.reset < now) {
    entry = { count: 0, reset: now + windowMs };
  }
  entry.count += 1;
  buckets.set(bucketKey, entry);
  if (entry.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.reset - now) / 1000));
    if (res && typeof res.setHeader === "function") {
      res.setHeader("Retry-After", String(retryAfter));
    }
    if (res && typeof res.status === "function") {
      res.status(429).json({ error: "Too many requests" });
    }
    return false;
  }
  return true;
}
