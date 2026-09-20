import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, signSession } from "@/lib/auth";
import { apiError, AppError, json } from "@/lib/http";
import { assertRateLimit } from "@/lib/rate-limit";
const bodySchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().transform((value) => value.toLowerCase()), password: z.string().min(8).max(72) });
export async function POST(request: Request) { try { const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"; assertRateLimit(`register:${ip}`, 5, 60 * 60_000); const input = bodySchema.parse(await request.json()); if (await db.user.findUnique({ where: { email: input.email } })) throw new AppError(409, "An account with this email already exists."); const user = await db.user.create({ data: { name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12) } }); const response = json({ id: user.id, name: user.name, email: user.email }, 201); response.cookies.set(sessionCookie(await signSession(user))); return response; } catch (error) { return apiError(error); } }
