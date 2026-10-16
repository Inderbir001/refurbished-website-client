import { safeFetch } from "@/lib/safe-fetch";

// Photos picked in the admin go to the store's own storage (Supabase) through /api/admin/media and come back as a public link.
// Big phone photos are shrunk in the browser first (max 1800px on the long side, WebP), so pages stay fast and the 8 MB limit is never hit.
const UPLOADABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_SIDE = 1800;

async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("This photo could not be read. Please use a JPEG, PNG or WebP image.");
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const needsWork = scale < 1 || file.size > 2.5 * 1024 * 1024 || !UPLOADABLE.has(file.type);
  if (!needsWork) { bitmap.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
  if (!blob) throw new Error("This photo could not be prepared. Please try another one.");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}

export async function uploadImage(file: File, alt = ""): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo (JPEG, PNG or WebP).");
  const ready = await shrink(file);
  if (ready.size > 8 * 1024 * 1024) throw new Error("That photo is too large even after shrinking. Please choose a smaller one.");
  const form = new FormData();
  form.set("file", ready); if (alt) form.set("alt", alt);
  const response = await safeFetch("/api/admin/media", { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "The upload failed.");
  return result.data.url as string;
}
