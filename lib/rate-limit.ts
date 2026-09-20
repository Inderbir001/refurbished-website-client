import { AppError } from "@/lib/http";
type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();
export function assertRateLimit(key: string, limit = 10, windowMs = 60_000) { const now = Date.now(); const current = buckets.get(key); if (!current || current.resetsAt <= now) { buckets.set(key, { count: 1, resetsAt: now + windowMs }); return; } if (current.count >= limit) throw new AppError(429, "Too many attempts. Please wait and try again."); current.count += 1; if (buckets.size > 5_000) for (const [id, bucket] of buckets) if (bucket.resetsAt <= now) buckets.delete(id); }
