import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/payments/webhook/") || request.nextUrl.pathname.startsWith("/api/maintenance/") || request.nextUrl.pathname === "/api/notifications/dispatch") return NextResponse.next();
  const origin = request.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : request.nextUrl.origin;
  if (origin && origin !== expected && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
