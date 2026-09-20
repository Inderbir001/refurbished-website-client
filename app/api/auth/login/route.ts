import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, signSession } from "@/lib/auth";
import { apiError, AppError, json } from "@/lib/http";
import { assertRateLimit } from "@/lib/rate-limit";
const bodySchema = z.object({ email: z.string().email().transform((value) => value.toLowerCase()), password: z.string().min(1) });
export async function POST(request: Request) { try { const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"; assertRateLimit(`login:${ip}`, 8, 15 * 60_000); const input = bodySchema.parse(await request.json()); const user = await db.user.findUnique({ where: { email: input.email } }); if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError(401, "Email or password is incorrect."); const response = json({ id: user.id, name: user.name, email: user.email, role: user.role }); response.cookies.set(sessionCookie(await signSession(user))); if (user.role !== "CUSTOMER") await db.auditLog.create({ data: { actorId: user.id, action: "ADMIN_LOGIN", entityType: "User", entityId: user.id } }); return response; } catch (error) { return apiError(error); } }
