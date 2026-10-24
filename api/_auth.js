// Shared session auth for /api/* handlers.
//
// The old `soma_auth=1` cookie is a client-readable UX flag (AuthGuard reads
// it from document.cookie). It is forgeable, so it authorizes nothing.
// Real enforcement lives here: `soma_session` is an HttpOnly HMAC-signed
// token (key = SITE_PASSWORD). Every handler that reads private data or
// mutates state MUST call requireAuth() or gate on isAuthed().
//
// Underscore prefix: Vercel does not serve _*.js as endpoints.

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "soma_session";
// 30 days, matching the login cookie Max-Age in api/auth.ts
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function getSecret() {
  return process.env.SITE_PASSWORD || "";
}

export function parseCookies(req) {
  const header = (req && req.headers && req.headers.cookie) || "";
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || k in out) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      out[k] = part.slice(i + 1).trim();
    }
  }
  return out;
}

// Mint a fresh token. Returns { token, expiresAt, maxAge }.
export function createSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expiresAt);
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return { token: `${payload}.${sig}`, expiresAt, maxAge: SESSION_TTL_SECONDS };
}

export function isAuthed(req) {
  // server/api-dev.mjs sets this for localhost dev, where the DEV frontend
  // carries no session cookie (AuthGuard bypasses login). Vercel never sets
  // it: in production the request object is constructed by the platform.
  if (req && req.localBypass === true) return true;
  const secret = getSecret();
  if (!secret) return false;
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

// Returns true when authorized. Otherwise sends 401 and returns false,
// so handlers use it as: if (!requireAuth(req, res)) return;
export function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  res.status(401).json({ error: "Unauthorized" });
  return false;
}
