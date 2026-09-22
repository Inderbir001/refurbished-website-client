import { NotificationChannel } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";
import { queueOrderNotification } from "@/lib/notifications/service";
import { assertRateLimit } from "@/lib/rate-limit";
import { createPasswordResetToken } from "@/lib/services/password-reset";
export async function POST(request: Request) { try { const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"; assertRateLimit(`password-reset:${ip}`, 4, 60 * 60_000); const { email } = z.object({ email: z.string().email().transform((value) => value.toLowerCase()) }).parse(await request.json()); const user = await db.user.findUnique({ where: { email } }); let developmentResetUrl: string | undefined; if (user?.email) { const token = await createPasswordResetToken(user.id); const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`; await queueOrderNotification({ userId: user.id, template: "PASSWORD_RESET", payload: { name: user.name, resetUrl }, destination: user.email, channels: [NotificationChannel.EMAIL] }); if (process.env.NODE_ENV !== "production") developmentResetUrl = resetUrl; } return json({ accepted: true, ...(developmentResetUrl ? { developmentResetUrl } : {}) }); } catch (error) { return apiError(error); } }
