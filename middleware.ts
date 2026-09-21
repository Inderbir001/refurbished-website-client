import { NextRequest, NextResponse } from "next/server";

const originOf = (value?: string) => { try { return value?.trim() ? new URL(value.trim()).origin : null; } catch { return null; } };

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Split deployment: the frontend never exposes the backend's private endpoints.
  if (process.env.BACKEND_URL && path.startsWith("/api/internal")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return NextResponse.next();
  if (path.startsWith("/api/payments/webhook/") || path.startsWith("/api/maintenance/") || path === "/api/notifications/dispatch") return NextResponse.next();
  // Same-origin browser requests only. Behind the frontend proxy the request host is the backend's, so the public site
  // address(es) come from NEXT_PUBLIC_APP_URL and, for extra addresses (e.g. a *.vercel.app alias), ALLOWED_ORIGINS.
  const origin = request.headers.get("origin");
  const allowed = new Set([originOf(process.env.NEXT_PUBLIC_APP_URL), request.nextUrl.origin, ...(process.env.ALLOWED_ORIGINS ?? "").split(",").map(originOf)].filter(Boolean));
  if (origin && !allowed.has(origin)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
