import type { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import { backendFetch, decode, encode } from "./remote";

// A stand-in for the Prisma client used by the frontend. Every read (db.product.findMany({...}) etc.) is sent to the
// backend, which runs it against the database and returns the result. The frontend needs no database credentials,
// and existing page code keeps working unchanged.
async function run(model: string, action: string, args: unknown) {
  const response = await backendFetch("/api/internal/db", { body: encode({ model, action, args: args ?? {} }) });
  const text = await response.text();
  let payload: { result?: unknown; error?: { name?: string; message?: string; code?: string } };
  try { payload = decode(text); } catch { throw new Error(`The backend returned an unexpected response (${response.status}).`); }
  if (!response.ok || payload.error) {
    const error = new Error(payload.error?.message ?? `Backend data request failed (${response.status}).`) as Error & { code?: string };
    error.name = payload.error?.name ?? "BackendError";
    error.code = payload.error?.code;
    throw error;
  }
  return payload.result;
}

// Every page render used to make several round trips browser -> Vercel -> Render -> Supabase. Public catalog data
// (categories, products, homepage, announcement...) changes rarely, so those reads are kept for a few seconds and shared
// by all visitors. Admin, account, checkout and order pages never use it, and neither does anything personal (carts,
// orders, users...). STOREFRONT_CACHE_SECONDS=0 turns it off.
const CACHEABLE_MODELS = new Set(["category", "brand", "product", "homepageSection", "homepageBanner", "collection", "siteContent", "store", "coupon"]);
const READ_ACTIONS = new Set(["findMany", "findFirst", "findUnique", "count", "aggregate"]);
const PRIVATE_PAGES = ["/admin", "/account", "/checkout", "/order-success"];
const cacheSeconds = () => { const value = Number(process.env.STOREFRONT_CACHE_SECONDS ?? 20); return Number.isFinite(value) && value > 0 ? value : 0; };
// Queries that filter on "now" would never repeat exactly: Dates count as the same for a minute.
const keyOf = (args: unknown) => JSON.stringify(args ?? {}, function (this: Record<string, unknown>, key: string, converted: unknown) { const raw = this[key]; return raw instanceof Date ? `d${Math.floor(raw.getTime() / 60_000)}` : typeof raw === "bigint" ? `${raw}n` : converted; });
async function cacheable(model: string, action: string) {
  if (!cacheSeconds() || !CACHEABLE_MODELS.has(model) || !READ_ACTIONS.has(action)) return false;
  try {
    const path = (await headers()).get("x-app-path");
    return Boolean(path) && !PRIVATE_PAGES.some((prefix) => path === prefix || path!.startsWith(`${prefix}/`));
  } catch { return false; } // not inside a page request (e.g. during a build)
}
// Kept in this server instance's memory, for exactly the TTL (no "serve old, refresh later" behaviour: a visitor never sees
// data older than the TTL), and identical simultaneous queries share one request.
const memo = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
async function read(model: string, action: string, args: unknown) {
  if (!(await cacheable(model, action))) return run(model, action, args);
  const key = `${model}.${action}.${keyOf(args)}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < cacheSeconds() * 1000) return structuredClone(hit.value);
  let pending = inflight.get(key);
  if (!pending) {
    pending = run(model, action, args).then((value) => {
      if (memo.size >= 300) memo.delete(memo.keys().next().value as string);
      memo.set(key, { at: Date.now(), value });
      return value;
    }).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return structuredClone(await pending); // callers get their own copy, so nothing they change can leak to other visitors
}

export function createRemoteDb(): PrismaClient {
  return new Proxy({}, {
    get(_target, model) {
      if (typeof model === "symbol" || model === "then") return undefined; // never look like a Promise
      if (model.startsWith("$")) return () => { throw new Error(`db.${model} runs on the backend only.`); };
      return new Proxy({}, { get(_delegate, action) { return typeof action === "symbol" ? undefined : (args?: unknown) => read(model, action, args); } });
    },
  }) as unknown as PrismaClient;
}
