import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { normalizeIndianPhone } from "@/lib/phone";

const owners = [Role.SUPER_ADMIN];
const staffRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER, Role.ORDER_MANAGER];

// Change someone's role or switch their account on/off. Owners only, and never in a way that could lock the store out.
const patchSchema = z.object({ id: z.string().cuid(), role: z.nativeEnum(Role).optional(), isActive: z.boolean().optional() });
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request, owners);
    const input = patchSchema.parse(await request.json());
    const before = await db.user.findUnique({ where: { id: input.id } });
    if (!before) throw new AppError(404, "User not found.");
    if (input.id === admin.sub && (input.isActive === false || (input.role && input.role !== before.role))) throw new AppError(409, "You cannot change your own access. Ask another owner.");
    const losesOwner = before.role === Role.SUPER_ADMIN && ((input.role && input.role !== Role.SUPER_ADMIN) || input.isActive === false);
    if (losesOwner && (await db.user.count({ where: { role: Role.SUPER_ADMIN, isActive: true, id: { not: before.id } } })) === 0) throw new AppError(409, "There must always be at least one active owner.");
    const user = await db.user.update({ where: { id: input.id }, data: { role: input.role, isActive: input.isActive } });
    await db.auditLog.create({ data: { actorId: admin.sub, action: "USER_ACCESS_UPDATED", entityType: "User", entityId: user.id, before: { role: before.role, isActive: before.isActive }, after: { role: user.role, isActive: user.isActive } } });
    return json({ id: user.id, role: user.role, isActive: user.isActive });
  } catch (error) { return apiError(error); }
}

// Give a registered customer access to the admin, by their email or phone number.
const addSchema = z.object({ identifier: z.string().trim().min(3).max(120), role: z.enum(["ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "SUPER_ADMIN"]) });
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request, owners);
    const input = addSchema.parse(await request.json());
    const text = input.identifier.trim();
    const phone = normalizeIndianPhone(text);
    const user = await db.user.findFirst({ where: text.includes("@") ? { email: { equals: text, mode: "insensitive" } } : { phone: typeof phone === "string" ? phone : text } });
    if (!user) throw new AppError(404, "No account found with that email or phone. They need to create an account on the shop first, then you can add them here.");
    if (staffRoles.includes(user.role)) throw new AppError(409, "This person is already on the team. Change their access in the list below.");
    const updated = await db.user.update({ where: { id: user.id }, data: { role: input.role, isActive: true } });
    await db.auditLog.create({ data: { actorId: admin.sub, action: "USER_ACCESS_UPDATED", entityType: "User", entityId: user.id, before: { role: user.role }, after: { role: updated.role, via: "team page" } } });
    return json({ id: updated.id, name: updated.name, role: updated.role }, 201);
  } catch (error) { return apiError(error); }
}
