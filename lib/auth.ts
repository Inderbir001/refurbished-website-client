import { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http";

const key = () => {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) throw new Error("AUTH_SECRET must be at least 32 characters in production.");
  return new TextEncoder().encode(secret || "development-only-change-me-before-deploying");
};
export type Session = { sub: string; role: Role; email: string };
export async function signSession(user: { id: string; role: Role; email: string }) {
  return new SignJWT({ role: user.role, email: user.email }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("7d").sign(key());
}
export async function readSession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    // The token is only proof of a past login: confirm the account still exists and is active, and use its current role.
    const user = await db.user.findUnique({ where: { id: payload.sub! }, select: { id: true, role: true, email: true, isActive: true } });
    if (!user || !user.isActive) return null;
    return { sub: user.id, role: user.role, email: user.email };
  } catch { return null; }
}
export async function currentSession() { return readSession((await cookies()).get("session")?.value); }
export async function sessionFromRequest(request: NextRequest) { return readSession(request.cookies.get("session")?.value); }
export async function requireSession(request: NextRequest) { const session = await sessionFromRequest(request); if (!session) throw new AppError(401, "Please sign in to continue."); return session; }
export async function requireAdmin(request: NextRequest, allowed: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]) {
  const session = await sessionFromRequest(request);
  if (!session || !allowed.includes(session.role)) throw new AppError(403, "Administrator access is required.");
  return session;
}
export const sessionCookie = (token: string) => ({ name: "session", value: token, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
