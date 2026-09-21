// A few-second memory of public storefront data, kept on the backend (Render), which is one long-running instance:
// most page requests are answered from memory instead of asking the database. It is off unless the backend is
// running as the API host (API_ONLY=true) or STOREFRONT_CACHE_SECONDS is set, so local development and single-host
// deployments behave exactly as before. Nothing personal (carts, sessions, orders) is ever kept here.

const store = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
let writeWindowUntil = 0;

const seconds = () => {
  const configured = process.env.STOREFRONT_CACHE_SECONDS;
  const value = Number(configured ?? (process.env.API_ONLY === "true" ? 20 : 0));
  return Number.isFinite(value) && value > 0 ? value : 0;
};

// An admin change is about to be saved: forget everything and skip the memory for a few seconds so the very next
// visitor already sees the new data (and nothing old gets remembered while the save is still running).
export function invalidatePageMemo() {
  store.clear();
  if (seconds() > 0) writeWindowUntil = Date.now() + 8_000;
}

export async function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const ttl = seconds() * 1000;
  if (!ttl || Date.now() < writeWindowUntil) return load();
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttl) return structuredClone(hit.value) as T;
  let pending = inflight.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = load().then((value) => {
      if (store.size >= 400) store.delete(store.keys().next().value as string);
      store.set(key, { at: Date.now(), value });
      return value;
    }).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return structuredClone(await pending); // every caller gets its own copy
}
