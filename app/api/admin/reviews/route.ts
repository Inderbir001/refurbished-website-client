import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
const schema = z.object({ id: z.string().cuid(), action: z.enum(["SHOW", "HIDE", "DELETE"]) });
export async function PATCH(request: NextRequest) { try { const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]); const input = schema.parse(await request.json()); const existing = await db.review.findUnique({ where: { id: input.id } }); if (!existing) throw new AppError(404, "Review not found."); if (input.action === "DELETE") await db.review.delete({ where: { id: input.id } }); else await db.review.update({ where: { id: input.id }, data: { isVisible: input.action === "SHOW" } }); await db.auditLog.create({ data: { actorId: admin.sub, action: `REVIEW_${input.action}`, entityType: "Review", entityId: input.id, before: { isVisible: existing.isVisible } } }); return json({ updated: true }); } catch (error) { return apiError(error); } }
