import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { apiError, AppError, json } from "@/lib/http";
import { MAX_VIDEO_BYTES, VIDEO_BUCKET, VIDEO_TYPES } from "@/lib/video";

// Videos are too big to pass through the website, so the browser uploads them straight to storage. This only hands out a
// one-time upload address (valid for a short time, for one file name) after checking who is asking and what the file is.
const schema = z.object({ name: z.string().trim().min(1).max(160), type: z.string(), size: z.number().int().positive() });
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]);
    const supabaseUrl = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) throw new AppError(503, "Video storage is not set up yet.");
    const input = schema.parse(await request.json());
    if (!VIDEO_TYPES.includes(input.type)) throw new AppError(400, "Please choose an MP4 or WebM video.");
    if (input.size > MAX_VIDEO_BYTES) throw new AppError(413, "That video is larger than 50 MB. Compress it, or paste a YouTube link instead.");
    const safe = input.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-80);
    const path = `videos/${Date.now()}-${crypto.randomUUID()}-${safe}`;
    const response = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${VIDEO_BUCKET}/${path}`, { method: "POST", headers: { authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "content-type": "application/json" }, body: "{}", signal: AbortSignal.timeout(15_000) });
    const result = (await response.json().catch(() => ({}))) as { url?: string };
    if (!response.ok || !result.url) { console.error("Video upload address failed", response.status); throw new AppError(502, "The video upload could not be started. Please try again."); }
    return json({ uploadUrl: `${supabaseUrl}/storage/v1${result.url}`, publicUrl: `${supabaseUrl}/storage/v1/object/public/${VIDEO_BUCKET}/${path}` });
  } catch (error) { return apiError(error); }
}
