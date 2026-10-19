// Small, cached copies of every stored photo.
// Each photo in the "product-images" storage is also saved as a 480px and a 900px WebP (plus 1600px for wide banners) under _t/<size>/ (made when the photo is
// uploaded, and for older photos by a one-off script). Pages ask for the small copy, which is a fraction of the size of the original.
export type ThumbSize = 480 | 900 | 1600;
const MARK = "/storage/v1/object/public/";
const BUCKET = "product-images";

// The storage path of the small copy for a photo path like "<store>/<file>.jpg".
export function thumbKey(path: string, size: ThumbSize) {
  const clean = path.split("?")[0];
  const dot = clean.lastIndexOf(".");
  const base = dot > clean.lastIndexOf("/") ? clean.slice(0, dot) : clean;
  return `_t/${size}/${base}.webp`;
}

// The address of the small copy for one of our photos; anything else (other websites, logos, the small copies themselves) is returned unchanged.
export function thumbUrl(url: string | null | undefined, size: ThumbSize = 480): string {
  if (!url) return "";
  const at = url.indexOf(MARK);
  if (at < 0) return url;
  const rest = url.slice(at + MARK.length);
  if (!rest.startsWith(`${BUCKET}/`)) return url;
  const path = rest.slice(BUCKET.length + 1);
  if (path.startsWith("_t/") || path.startsWith("videos/")) return url;
  return `${url.slice(0, at + MARK.length)}${BUCKET}/${thumbKey(path, size)}`;
}
