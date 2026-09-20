import crypto from "node:crypto";
import { NotificationChannel } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";
import { queueOrderNotification } from "@/lib/notifications/service";
import { assertRateLimit } from "@/lib/rate-limit";
export async function POST(request: Request) { try { const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"; assertRateLimit(`password-reset:${ip}`, 4, 60 * 60_000); const { email } = z.object({ email: z.string().email().transform((value) => value.toLowerCase()) }).parse(await request.json()); const user = await db.user.findUnique({ where: { email } }); let developmentResetUrl: string | undefined; if (user) { const token = crypto.randomBytes(32).toString("hex"); const tokenHash = crypto.createHash("sha256").update(token).digest("hex"); await db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60_000) } }); const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`; await queueOrderNotification({ userId: user.id, template: "PASSWORD_RESET", payload: { name: user.name, resetUrl }, destination: user.email, channels: [NotificationChannel.EMAIL] }); if (process.env.NODE_ENV !== "production") developmentResetUrl = resetUrl; } return json({ accepted: true, ...(developmentResetUrl ? { developmentResetUrl } : {}) }); } catch (error) { return apiError(error); } }
