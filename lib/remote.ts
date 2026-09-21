// Split deployment support: the frontend (Vercel) talks to the backend (Render) instead of the database.
// Set BACKEND_URL on the frontend only. When it is not set (local development, or a single-host deployment)
// nothing here is used and the app behaves exactly as before.

export const backendUrl = () => process.env.BACKEND_URL?.trim().replace(/\/+$/, "") || null;
export const isFrontendOnly = () => backendUrl() !== null;

// JSON that keeps Dates (and BigInts) intact across the network.
export function encode(value: unknown) {
  return JSON.stringify(value, function (this: Record<string, unknown>, key: string, converted: unknown) {
    const raw = this[key]; // JSON.stringify calls Date#toJSON first, so read the original value
    if (raw instanceof Date) return { $date: raw.toISOString() };
    if (typeof raw === "bigint") return { $bigint: raw.toString() };
    return converted;
  });
}
export function decode<T = unknown>(text: string): T {
  return JSON.parse(text, (_key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === "$date") return new Date((value as { $date: string }).$date);
      if (keys.length === 1 && keys[0] === "$bigint") return BigInt((value as { $bigint: string }).$bigint);
    }
    return value;
  });
}

// Server-to-server call from the frontend to the backend's private /api/internal endpoints.
// The shared secret never reaches the browser.
export async function backendFetch(path: string, init: { method?: string; body?: string } = {}) {
  const base = backendUrl();
  const secret = process.env.INTERNAL_API_SECRET;
  if (!base || !secret) throw new Error("BACKEND_URL and INTERNAL_API_SECRET must both be set on the frontend.");
  const timeout = Number(process.env.BACKEND_TIMEOUT_MS ?? 50_000); // a sleeping free Render instance can take ~30-50s to wake
  const request = () => fetch(`${base}${path}`, { method: init.method ?? "POST", body: init.body, cache: "no-store", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(timeout) });
  try { return await request(); } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") throw error;
    return request(); // one retry for a dropped connection
  }
}
