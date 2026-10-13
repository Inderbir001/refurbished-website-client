// Copies every product photo that still points at another website into this project's own Supabase Storage bucket,
// then repoints the product images at the copies. Safe to re-run: photos already in the bucket are skipped, and a
// photo is only repointed after its copy was uploaded successfully.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... STORAGE_BUCKET=product-images \
//   npx tsx prisma/migrate-images.ts                 # dry run: checks every photo is reachable and totals their size
//   npx tsx prisma/migrate-images.ts --apply         # copies and repoints
//   npx tsx prisma/migrate-images.ts --apply --limit 10   # only the first 10 (to try it out)
//
// The database is whatever DATABASE_URL points at. The service-role key is read from the environment only.
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const limitAt = args.indexOf("--limit");
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : Infinity;
const supabaseUrl = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const bucket = process.env.STORAGE_BUCKET ?? "product-images";
const ownPrefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };

async function pool<T>(items: T[], size: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { while (next < items.length) { const i = next++; await worker(items[i], i); } }));
}
async function withRetry<T>(label: string, run: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try { return await run(); } catch (error) { last = error; if (attempt < tries) await new Promise((r) => setTimeout(r, 600 * attempt)); }
  }
  throw new Error(`${label}: ${last instanceof Error ? last.message : String(last)}`);
}

async function main() {
  if (apply && (!supabaseUrl || !serviceKey)) throw new Error("--apply needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
  const rows = await db.productImage.findMany({ where: { product: { deletedAt: null } }, select: { id: true, url: true, position: true, product: { select: { sku: true } } }, orderBy: [{ productId: "asc" }, { position: "asc" }] });
  const external = rows.filter((r) => /^https?:\/\//i.test(r.url) && !(supabaseUrl && r.url.startsWith(ownPrefix)));
  const byUrl = new Map<string, { sku: string; position: number }>();
  for (const r of external) if (!byUrl.has(r.url)) byUrl.set(r.url, { sku: r.product.sku, position: r.position });
  const todo = [...byUrl.entries()].slice(0, Number.isFinite(limit) ? limit : undefined);
  const hosts = new Map<string, number>();
  for (const [u] of todo) hosts.set(new URL(u).host, (hosts.get(new URL(u).host) ?? 0) + 1);
  console.log(`Images of live/draft products: ${rows.length} | already in our storage: ${rows.length - external.length} | to copy: ${todo.length} distinct file(s) from ${[...hosts].map(([h, n]) => `${h} (${n})`).join(", ") || "-"}`);
  if (!todo.length) return;

  if (!apply) {
    let bytes = 0, bad = 0; const types = new Map<string, number>();
    await pool(todo, 8, async ([url]) => {
      try {
        const res = await withRetry("HEAD", async () => { const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(20_000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r; });
        bytes += Number(res.headers.get("content-length") ?? 0);
        const t = (res.headers.get("content-type") ?? "?").split(";")[0]; types.set(t, (types.get(t) ?? 0) + 1);
      } catch (error) { bad++; console.log("  unreachable:", url.slice(-70), String(error).slice(0, 60)); }
    });
    console.log(`Reachable: ${todo.length - bad}/${todo.length} | total size ~${(bytes / 1048576).toFixed(0)} MB | types: ${[...types].map(([t, n]) => `${t} x${n}`).join(", ")}`);
    console.log("Dry run only. Add --apply to copy them.");
    return;
  }

  let done = 0, failed = 0, bytes = 0;
  await pool(todo, 6, async ([url, meta], index) => {
    try {
      const downloaded = await withRetry("download", async () => {
        const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(45_000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const type = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        if (!EXT[type]) throw new Error(`not an image type (${type || "unknown"})`);
        return { body: Buffer.from(await r.arrayBuffer()), type };
      });
      const path = `products/${meta.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${meta.position}-${createHash("sha1").update(url).digest("hex").slice(0, 8)}.${EXT[downloaded.type]}`;
      await withRetry("upload", async () => {
        const r = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
          method: "POST", body: downloaded.body, signal: AbortSignal.timeout(60_000),
          headers: { authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "content-type": downloaded.type, "x-upsert": "true", "cache-control": "max-age=31536000" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
      });
      await db.productImage.updateMany({ where: { url }, data: { url: `${ownPrefix}${path}` } });
      bytes += downloaded.body.length; done++;
    } catch (error) { failed++; console.log(`  FAILED #${index}: ${url.slice(-60)} -> ${error instanceof Error ? error.message : error}`); }
    if ((done + failed) % 25 === 0) console.log(`  ... ${done + failed}/${todo.length} (${failed} failed)`);
  });
  console.log(`Copied ${done}/${todo.length} photos (${(bytes / 1048576).toFixed(0)} MB)${failed ? ` | ${failed} failed (re-run to retry them; they still point at the original)` : ""}`);
  if (failed) process.exitCode = 2;
}

main().then(() => db.$disconnect()).catch(async (error) => { console.error("FAILED:", error.message); await db.$disconnect(); process.exit(1); });
