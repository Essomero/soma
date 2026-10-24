import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSessionToken, isAuthed } from "./_auth.js";

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
  const { password } = req.body || {};
  const validPassword = process.env.SITE_PASSWORD;

  if (!validPassword) {
    return res.status(500).json({ error: "Auth not configured" });
  }

  if (password === validPassword) {
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
