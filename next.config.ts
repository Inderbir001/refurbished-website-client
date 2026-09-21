import type { NextConfig } from "next";

// Split deployment (frontend on Vercel, backend on Render): with BACKEND_URL set at build time, every /api/* request
// is forwarded to the backend, so the browser still talks to one site (cookies stay first-party, no CORS).
// Without BACKEND_URL nothing changes: the app serves its own API, exactly as before.
const backend = process.env.BACKEND_URL?.trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] },
  async rewrites() {
    return backend ? { beforeFiles: [{ source: "/api/:path*", destination: `${backend}/api/:path*` }], afterFiles: [], fallback: [] } : [];
  },
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }, { key: "X-Frame-Options", value: "SAMEORIGIN" }] }];
  },
};
export default nextConfig;
