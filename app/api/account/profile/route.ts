import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
const schema = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")), currentPassword: z.string().optional(), newPassword: z.string().min(8).max(72).optional() }).refine((value) => !value.newPassword || Boolean(value.currentPassword), { message: "Current password is required to set a new password." });
export async function PATCH(request: NextRequest) { try { const session = await requireSession(request); const input = schema.parse(await request.json()); const user = await db.user.findUniqueOrThrow({ where: { id: session.sub } }); if (input.newPassword && !(await bcrypt.compare(input.currentPassword!, user.passwordHash))) throw new AppError(401, "Current password is incorrect."); const updated = await db.user.update({ where: { id: user.id }, data: { name: input.name, phone: input.phone || null, passwordHash: input.newPassword ? await bcrypt.hash(input.newPassword, 12) : undefined }, select: { id: true, name: true, email: true, phone: true } }); return json(updated); } catch (error) { return apiError(error); } }
