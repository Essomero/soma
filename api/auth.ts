import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body || {};
  const validPassword = process.env.SITE_PASSWORD;

  if (!validPassword) {
    return res.status(500).json({ error: "Auth not configured" });
  }

  if (password === validPassword) {
    // Secure only behind HTTPS (Vercel sets x-forwarded-proto). Local HTTP
    // dev has no such header, so the cookie still lands there. HttpOnly is
    // intentionally absent: AuthGuard reads the flag from document.cookie.
    // The cookie holds a boolean, never a session, so theft value is minimal.
    const proto = (req.headers["x-forwarded-proto"] as string | undefined) || "";
    const secure = proto.split(",")[0].trim() === "https" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `soma_auth=1; Path=/; Max-Age=2592000; SameSite=Lax${secure}`);
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: "Invalid password" });
}
