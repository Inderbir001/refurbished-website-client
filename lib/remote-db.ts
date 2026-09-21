import type { PrismaClient } from "@prisma/client";
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

export function createRemoteDb(): PrismaClient {
  return new Proxy({}, {
    get(_target, model) {
      if (typeof model === "symbol" || model === "then") return undefined; // never look like a Promise
      if (model.startsWith("$")) return () => { throw new Error(`db.${model} runs on the backend only.`); };
      return new Proxy({}, { get(_delegate, action) { return typeof action === "symbol" ? undefined : (args?: unknown) => run(model, action, args); } });
    },
  }) as unknown as PrismaClient;
}
