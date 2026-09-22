import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, signSession } from "@/lib/auth";
import { apiError, AppError, json } from "@/lib/http";
import { indianPhone } from "@/lib/phone";
import { assertRateLimit } from "@/lib/rate-limit";
import { hashSecurityAnswer } from "@/lib/security-questions";
import { mergeGuestCart } from "@/lib/services/cart-service";
// Phone number and password are required; the email is optional (a blank box counts as "no email").
const optionalEmail = z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), z.string().trim().email("enter a valid email address or leave it empty").transform((value) => value.toLowerCase()).optional());
// The security question is optional, but if either half is filled in, both must be (a question with no answer is useless).
const bodySchema = z.object({ name: z.string().trim().min(2).max(100), phone: indianPhone, email: optionalEmail, password: z.string().min(8).max(72), securityQuestion: z.string().trim().max(200).optional(), securityAnswer: z.string().trim().min(2).max(200).optional() })
  .refine((value) => !value.securityQuestion === !value.securityAnswer, { message: "Add an answer, or remove the security question.", path: ["securityAnswer"] });
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    assertRateLimit(`register:${ip}`, 5, 60 * 60_000);
    const input = bodySchema.parse(await request.json());
    if (await db.user.findUnique({ where: { phone: input.phone } })) throw new AppError(409, "An account with this phone number already exists. Please sign in.");
    if (input.email && await db.user.findUnique({ where: { email: input.email } })) throw new AppError(409, "An account with this email already exists. Please sign in.");
    let user;
    try {
      user = await db.user.create({ data: {
        name: input.name, phone: input.phone, email: input.email ?? null, passwordHash: await bcrypt.hash(input.password, 12),
        securityQuestion: input.securityQuestion || null,
        securityAnswerHash: input.securityAnswer ? await hashSecurityAnswer(input.securityAnswer) : null,
      } });
    }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError(409, "An account with these details already exists. Please sign in."); throw error; }
    const guestCart = (await cookies()).get("guest_cart")?.value;
    await mergeGuestCart(guestCart, user.id);
    const response = json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }, 201);
    response.cookies.set(sessionCookie(await signSession(user)));
    if (guestCart) response.cookies.delete("guest_cart");
    return response;
  } catch (error) { return apiError(error); }
}
