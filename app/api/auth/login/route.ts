import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, signSession } from "@/lib/auth";
import { apiError, AppError, json } from "@/lib/http";
import { normalizeIndianPhone } from "@/lib/phone";
import { assertRateLimit } from "@/lib/rate-limit";
import { mergeGuestCart } from "@/lib/services/cart-service";
// Customers sign in with their phone number (or email); "email" is still accepted as the field name.
const bodySchema = z.object({ identifier: z.string().trim().min(1).optional(), email: z.string().trim().min(1).optional(), password: z.string().min(1) }).transform((value) => ({ identifier: value.identifier ?? value.email ?? "", password: value.password })).refine((value) => value.identifier.length > 0, { message: "Enter your phone number or email." });
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    assertRateLimit(`login:${ip}`, 8, 15 * 60_000);
    const input = bodySchema.parse(await request.json());
    const byEmail = input.identifier.includes("@");
    const phone = byEmail ? "" : String(normalizeIndianPhone(input.identifier));
    const user = byEmail ? await db.user.findUnique({ where: { email: input.identifier.toLowerCase() } }) : /^[6-9]\d{9}$/.test(phone) ? await db.user.findUnique({ where: { phone } }) : null;
    if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError(401, "Phone number, email or password is incorrect.");
    const guestCart = (await cookies()).get("guest_cart")?.value;
    if (user.role === "CUSTOMER") await mergeGuestCart(guestCart, user.id);
    const response = json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role });
    response.cookies.set(sessionCookie(await signSession(user)));
    if (guestCart && user.role === "CUSTOMER") response.cookies.delete("guest_cart");
    if (user.role !== "CUSTOMER") await db.auditLog.create({ data: { actorId: user.id, action: "ADMIN_LOGIN", entityType: "User", entityId: user.id } });
    return response;
  } catch (error) { return apiError(error); }
}
