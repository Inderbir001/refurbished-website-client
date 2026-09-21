import { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { cache } from "react";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { backendFetch, isFrontendOnly } from "@/lib/remote";

const key = () => {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) throw new Error("AUTH_SECRET must be at least 32 characters in production.");
  return new TextEncoder().encode(secret || "development-only-change-me-before-deploying");
};
// `email` is the account's display identifier: its email, or the phone number for accounts created without one.
export type Session = { sub: string; role: Role; email: string };
export const accountLabel = (user: { email: string | null; phone: string | null }) => user.email ?? user.phone ?? "";
export async function signSession(user: { id: string; role: Role; email: string | null; phone: string | null }) {
  return new SignJWT({ role: user.role, email: accountLabel(user) }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("7d").sign(key());
}
// Verifies the token signature (needs AUTH_SECRET, so this only runs where that secret lives: the backend / a single-host app).
export async function verifySessionLocally(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    // The token is only proof of a past login: confirm the account still exists and is active, and use its current role.
    const user = await db.user.findUnique({ where: { id: payload.sub! }, select: { id: true, role: true, email: true, phone: true, isActive: true } });
    if (!user || !user.isActive) return null;
    return { sub: user.id, role: user.role, email: accountLabel(user) };
  } catch { return null; }
}
// Split deployment: remember a verified cookie for a few seconds so every click does not wait for the backend again.
// (Writes and admin API calls are always verified by the backend itself.)
const verified = new Map<string, { until: number; session: Session | null }>();
export async function readSession(token?: string): Promise<Session | null> {
  if (!token) return null;
  if (!isFrontendOnly()) return verifySessionLocally(token);
  const known = verified.get(token);
  if (known && known.until > Date.now()) return known.session;
  // The frontend holds no AUTH_SECRET, so the backend checks the cookie for it.
  try {
    const response = await backendFetch("/api/internal/session", { body: JSON.stringify({ token }) });
    const session = response.ok ? ((await response.json()) as { data: Session | null }).data : null;
    if (verified.size > 500) verified.clear();
    verified.set(token, { until: Date.now() + 15_000, session });
    return session;
  } catch { return null; }
}
// cache(): several components on one page ask for the session; verify it once per request.
export const currentSession = cache(async () => readSession((await cookies()).get("session")?.value));
export async function sessionFromRequest(request: NextRequest) { return readSession(request.cookies.get("session")?.value); }
export async function requireSession(request: NextRequest) { const session = await sessionFromRequest(request); if (!session) throw new AppError(401, "Please sign in to continue."); return session; }
export async function requireAdmin(request: NextRequest, allowed: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]) {
  const session = await sessionFromRequest(request);
  if (!session || !allowed.includes(session.role)) throw new AppError(403, "Administrator access is required.");
  return session;
}
export const sessionCookie = (token: string) => ({ name: "session", value: token, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
