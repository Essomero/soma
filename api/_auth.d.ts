declare module "./_auth" {
  export const SESSION_COOKIE: string;
  export const SESSION_TTL_SECONDS: number;
  export function parseCookies(req: unknown): Record<string, string>;
  export function createSessionToken(): { token: string; expiresAt: number; maxAge: number };
  export function isAuthed(req: unknown): boolean;
  export function requireAuth(req: unknown, res: unknown): boolean;
}