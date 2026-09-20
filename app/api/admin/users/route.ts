import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
const schema = z.object({ id: z.string().cuid(), role: z.nativeEnum(Role).optional(), isActive: z.boolean().optional() });
export async function PATCH(request: NextRequest) { try { const admin = await requireAdmin(request, [Role.SUPER_ADMIN]); const input = schema.parse(await request.json()); if (input.id === admin.sub && input.isActive === false) throw new AppError(409, "You cannot deactivate your own account."); const before = await db.user.findUnique({ where: { id: input.id } }); if (!before) throw new AppError(404, "User not found."); const user = await db.user.update({ where: { id: input.id }, data: { role: input.role, isActive: input.isActive } }); await db.auditLog.create({ data: { actorId: admin.sub, action: "USER_ACCESS_UPDATED", entityType: "User", entityId: user.id, before: { role: before.role, isActive: before.isActive }, after: { role: user.role, isActive: user.isActive } } }); return json({ id: user.id, role: user.role, isActive: user.isActive }); } catch (error) { return apiError(error); } }
