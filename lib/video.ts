// Product videos: a YouTube / Vimeo link, or a video file uploaded to the store's own storage (mp4 / webm).
export type VideoInfo =
  | { kind: "youtube"; id: string; embed: string; thumb: string }
  | { kind: "vimeo"; id: string; embed: string; thumb: null }
  | { kind: "file"; url: string };

const YT = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/i;
const VIMEO = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:video\/)?(\d{6,12})(?:[?&#/].*)?$/i;
export const VIDEO_BUCKET = "product-videos";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/webm"];

export function parseVideo(url: string): VideoInfo | null {
  const text = url.trim();
  const yt = text.match(YT);
  if (yt) return { kind: "youtube", id: yt[1], embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`, thumb: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` };
  const vm = text.match(VIMEO);
  if (vm) return { kind: "vimeo", id: vm[1], embed: `https://player.vimeo.com/video/${vm[1]}`, thumb: null };
  if (/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])[^\s]+\.(mp4|webm)(\?[^\s]*)?$/i.test(text)) return { kind: "file", url: text };
  return null;
}

// Only YouTube, Vimeo, or a file from our own video storage may be saved on a product.
export function isAllowedVideo(url: string, storageBase = process.env.SUPABASE_URL ?? "") {
  const info = parseVideo(url);
  if (!info) return false;
  if (info.kind !== "file") return true;
  return Boolean(storageBase) && info.url.startsWith(`${storageBase.replace(/\/+$/, "")}/storage/v1/object/public/${VIDEO_BUCKET}/`);
}
