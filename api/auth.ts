import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
// @ts-expect-error — JS module, no declarations alongside serverless functions
import { createSessionToken, isAuthed } from "./_auth.js";
// @ts-expect-error — JS module, no declarations alongside serverless functions
import { rateLimit } from "./_limits.js";

function passwordsMatch(a: unknown, b: string): boolean {
  if (typeof a !== "string") return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // GET : session check for AuthGuard. The client-readable flag alone
  // authorizes nothing, so the guard confirms the signed session here.
  // Stale or forged flags fall through to the public-page check.
  if (req.method === "GET") {
    return res.status(200).json({ authenticated: isAuthed(req) });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  // 10 attempts/minute per IP: single-password gate, brute-force first.
  if (!rateLimit(req as never, res as never, { key: "login", limit: 10, windowMs: 60_000 })) return;
  const { password } = req.body || {};
  const validPassword = process.env.SITE_PASSWORD;

  if (!validPassword) {
    return res.status(500).json({ error: "Auth not configured" });
  }

  if (passwordsMatch(password, validPassword)) {
    // Two cookies: soma_auth stays the client-readable UX flag AuthGuard
    // checks from document.cookie. soma_session is the HttpOnly HMAC-signed
    // token every /api/* handler enforces (see api/_auth.js). The flag alone
    // authorizes nothing.
    const session = createSessionToken();
    const proto = (req.headers["x-forwarded-proto"] as string | undefined) || "";
    const secure = proto.split(",")[0].trim() === "https" ? "; Secure" : "";
    res.setHeader("Set-Cookie", [
      `soma_auth=1; Path=/; Max-Age=2592000; SameSite=Lax${secure}`,
      `soma_session=${session.token}; Path=/; Max-Age=${session.maxAge}; HttpOnly; SameSite=Lax${secure}`,
    ]);
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: "Invalid password" });
}
