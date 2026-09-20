import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
export async function POST(request: Request) { try { const input = z.object({ token: z.string().min(32), password: z.string().min(8).max(72) }).parse(await request.json()); const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex"); const token = await db.passwordResetToken.findUnique({ where: { tokenHash } }); if (!token || token.usedAt || token.expiresAt < new Date()) throw new AppError(400, "This reset link is invalid or expired."); await db.$transaction([db.user.update({ where: { id: token.userId }, data: { passwordHash: await bcrypt.hash(input.password, 12) } }), db.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } })]); return json({ reset: true }); } catch (error) { return apiError(error); } }
