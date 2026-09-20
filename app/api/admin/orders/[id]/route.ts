import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";
const schema = z.object({ internalNotes: z.string().trim().max(5000) });
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { try { const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.ORDER_MANAGER]); const id = (await context.params).id; const input = schema.parse(await request.json()); const order = await db.order.update({ where: { id }, data: { internalNotes: input.internalNotes } }); await db.auditLog.create({ data: { actorId: admin.sub, action: "ORDER_NOTES_UPDATED", entityType: "Order", entityId: id } }); return json(order); } catch (error) { return apiError(error); } }
