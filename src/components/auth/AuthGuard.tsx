import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import { AuthContext } from "@/lib/AuthContext";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

function slugFromPath(pathname: string): string {
  // Print views share the visibility of the page they print.
  const printMatch = pathname.match(
    /^\/(stories|series|courses|notes|docs|guides|podcast|featured|tests)\/([^/]+)\/print$/
  );
  if (printMatch) return printMatch[2];
  // Article pages: a slug with status=published reads without the cookie.
  // Index, editor, and print-index paths never match, so they stay login-gated.
  const pageMatch = pathname.match(
    /^\/(stories|series|courses|notes|docs|guides|podcast|featured)\/([^/]+)$/
  );
  if (pageMatch) return pageMatch[2];
  return "";
}

async function checkPublic(slug: string): Promise<boolean> {
  if (!slug) return false;
  try {
    const r = await fetch(`/api/public?slug=${encodeURIComponent(slug)}`);
    const data = await r.json();
    return !!data.public;
  } catch {
    return false;
  }
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState(false); // true = has auth cookie, false = public access
  const [authedPath, setAuthedPath] = useState<string | null>(null);

  useEffect(() => {
    // Skip auth in local dev
    if (import.meta.env.DEV) {
      setAuthed(true);
      setIsOwner(true);
      return;
    }

    // The soma_auth flag alone authorizes nothing (it is client-readable and
    // forgeable, and predates the signed session). A present flag earns a
    // server check; a missing or stale one falls through to the public check.
    const slug = slugFromPath(pathname);

    if (authedPath === pathname && authed === true) return;

    const cookie = getCookie("soma_auth");
    if (cookie) {
      fetch("/api/auth")
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })).catch(() => ({ ok: false, d: {} })))
        .then(({ ok, d }: { ok: boolean; d: { authenticated?: boolean } }) => {
          if (ok && d.authenticated) {
            setAuthed(true);
            setIsOwner(true);
            setAuthedPath(pathname);
          } else {
            setAuthedPath(null);
            checkPublic(slug).then((isPublic) => {
              if (isPublic) {
                setAuthed(true);
                setIsOwner(false); // public access, not the owner
                setAuthedPath(pathname);
              } else {
                setAuthed(false);
              }
            });
          }
        })
        .catch(() => setAuthed(false));
      return;
    }

    // No auth cookie. Check if this specific page is public.
    if (!slug) {
      setAuthed(false);
      return;
    }

    // An unknown slug falls through to setAuthed(false), same as an unlisted
    // story: guessing slugs earns the login page rather than a 404 that
    // confirms what exists.

    checkPublic(slug).then(isPublic => {
      if (isPublic) {
        setAuthed(true);
        setIsOwner(false); // public access, not the owner
        setAuthedPath(pathname);
      } else {
        setAuthed(false);
      }
    });
  }, [pathname]);

  const handleLogin = useCallback(async (password: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
        setIsOwner(true);
        return null;
      }
      return "Invalid password";
    } catch {
      return "Network error : try again";
    }
  }, []);

  if (authed === null) return null;
  if (!authed) return <LoginPage onLogin={handleLogin} />;

  return (
    <AuthContext.Provider value={{ isOwner }}>
      {children}
    </AuthContext.Provider>
  );
}
