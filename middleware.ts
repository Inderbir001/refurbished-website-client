import { NextRequest, NextResponse } from "next/server";

const originOf = (value?: string) => { try { return value?.trim() ? new URL(value.trim()).origin : null; } catch { return null; } };

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Backend-only host (Render): the store's pages live on the frontend, so send visitors there and keep only /api/* here.
  if (process.env.API_ONLY === "true" && !path.startsWith("/api/")) {
    const site = originOf(process.env.NEXT_PUBLIC_APP_URL);
    if (site) return NextResponse.redirect(new URL(path + request.nextUrl.search, site), 307);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!path.startsWith("/api/")) {
    // Server code (the storefront data cache) needs to know which page is being rendered.
    const forwarded = new Headers(request.headers);
    forwarded.set("x-app-path", path);
    return NextResponse.next({ request: { headers: forwarded } });
  }
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

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
