import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
const schema = z.object({ id: z.string().cuid().optional(), name: z.string().trim().min(2), rate: z.number().int().min(0).max(50), homeState: z.string().trim().min(2), isActive: z.boolean().default(true) });
export async function POST(request: NextRequest) { try { const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN]); const input = schema.parse(await request.json()); const store = await db.store.findFirst(); if (!store) throw new AppError(409, "Store setup is incomplete."); const rule = await db.taxRule.create({ data: { ...input, id: undefined, storeId: store.id } }); await db.auditLog.create({ data: { actorId: admin.sub, action: "TAX_RULE_CREATED", entityType: "TaxRule", entityId: rule.id } }); return json(rule, 201); } catch (error) { return apiError(error); } }
export async function PATCH(request: NextRequest) { try { const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN]); const input = schema.refine((value) => Boolean(value.id)).parse(await request.json()); const rule = await db.taxRule.update({ where: { id: input.id! }, data: { name: input.name, rate: input.rate, homeState: input.homeState, isActive: input.isActive } }); await db.auditLog.create({ data: { actorId: admin.sub, action: "TAX_RULE_UPDATED", entityType: "TaxRule", entityId: rule.id } }); return json(rule); } catch (error) { return apiError(error); } }
