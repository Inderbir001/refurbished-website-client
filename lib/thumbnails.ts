import sharp from "sharp";
import { thumbKey, type ThumbSize } from "@/lib/image-url";

const SIZES: ThumbSize[] = [480, 900];
const YEAR = "31536000";

// Saves a file in the store's storage with a one-year cache (photos never change once uploaded: every file name is unique).
export async function putCached(supabaseUrl: string, serviceKey: string, bucket: string, path: string, data: Blob, upsert = false) {
  const form = new FormData();
  form.append("cacheControl", YEAR);
  form.append("", data);
  return fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, { method: "POST", headers: { authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "x-upsert": upsert ? "true" : "false" }, body: form, signal: AbortSignal.timeout(30_000) });
}

// Makes the small WebP copies of a photo. Never throws: pages fall back to the original photo if a copy is missing.
export async function saveThumbnails(supabaseUrl: string, serviceKey: string, bucket: string, path: string, original: Buffer) {
  for (const size of SIZES) {
    try {
      const data = await sharp(original, { failOn: "none" }).rotate().resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      const response = await putCached(supabaseUrl, serviceKey, bucket, thumbKey(path, size), new Blob([new Uint8Array(data)], { type: "image/webp" }), true);
      if (!response.ok) console.error("Thumbnail upload failed", size, response.status);
    } catch (error) { console.error("Thumbnail failed", size, error instanceof Error ? error.message : error); }
  }
}
