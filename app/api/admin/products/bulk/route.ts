import { Prisma, ProductStatus, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";
const schema = z.discriminatedUnion("action", [z.object({ action: z.literal("PUBLISH"), productIds: z.array(z.string().cuid()).min(1).max(500) }), z.object({ action: z.literal("UNPUBLISH"), productIds: z.array(z.string().cuid()).min(1).max(500) }), z.object({ action: z.literal("SET_PRICE"), productIds: z.array(z.string().cuid()).min(1).max(500), basePrice: z.number().int().positive(), salePrice: z.number().int().positive().nullable().optional() })]);
export async function POST(request: NextRequest) { try { const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]); const input = schema.parse(await request.json()); let data: Prisma.ProductUpdateManyMutationInput; if (input.action === "PUBLISH") data = { status: ProductStatus.ACTIVE }; else if (input.action === "UNPUBLISH") data = { status: ProductStatus.DRAFT }; else data = { basePrice: input.basePrice, salePrice: input.salePrice }; const result = await db.product.updateMany({ where: { id: { in: input.productIds }, deletedAt: null }, data }); await db.auditLog.create({ data: { actorId: admin.sub, action: `PRODUCT_BULK_${input.action}`, entityType: "Product", entityId: "bulk", after: { count: result.count } } }); return json({ updated: result.count }); } catch (error) { return apiError(error); } }
