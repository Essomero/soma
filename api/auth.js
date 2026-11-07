// Auth endpoint — JS version for Docker / Fly / Railway (Vercel uses auth.ts with types)
// Logic mirrors api/auth.ts but pure JS so node server/index.mjs can import it without TS.

import { timingSafeEqual } from "node:crypto";
import { createSessionToken, isAuthed } from "./_auth.js";
import { rateLimit } from "./_limits.js";

function passwordsMatch(a, b) {
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

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ authenticated: isAuthed(req) });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!rateLimit(req, res, { key: "login", limit: 10, windowMs: 60_000 })) return;
  const { password } = req.body || {};
  const validPassword = process.env.SITE_PASSWORD;
  if (!validPassword) {
    return res.status(500).json({ error: "Auth not configured" });
  }
  if (passwordsMatch(password, validPassword)) {
    const session = createSessionToken();
    const proto = (req.headers["x-forwarded-proto"] || "");
    const secure = proto.split(",")[0].trim() === "https" ? "; Secure" : "";
    res.setHeader("Set-Cookie", [
      `soma_auth=1; Path=/; Max-Age=2592000; SameSite=Lax${secure}`,
      `soma_session=${session.token}; Path=/; Max-Age=${session.maxAge}; HttpOnly; SameSite=Lax${secure}`,
    ]);
    return res.status(200).json({ success: true });
  }
  return res.status(401).json({ error: "Invalid password" });
}
