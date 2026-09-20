import { InventoryReason, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { stockAfterAdjustment } from "@/lib/services/inventory-service";
const schema = z.object({ variantId: z.string().cuid(), delta: z.number().int().min(-100000).max(100000).refine((value) => value !== 0), note: z.string().trim().min(3).max(300) });
export async function POST(request: NextRequest) { try { const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]); const input = schema.parse(await request.json()); const result = await db.$transaction(async (tx) => { const variant = await tx.productVariant.findUnique({ where: { id: input.variantId }, include: { product: true } }); if (!variant) throw new AppError(404, "Variant not found."); const next = stockAfterAdjustment(variant.stock, input.delta); const updated = await tx.productVariant.update({ where: { id: variant.id }, data: { stock: next } }); await tx.inventoryTransaction.create({ data: { variantId: variant.id, quantityDelta: input.delta, previousStock: variant.stock, resultingStock: next, reason: InventoryReason.ADJUSTMENT, reference: input.note, actorId: admin.sub } }); await tx.auditLog.create({ data: { actorId: admin.sub, action: "INVENTORY_ADJUSTED", entityType: "ProductVariant", entityId: variant.id, before: { stock: variant.stock }, after: { stock: next, note: input.note } } }); return updated; }); return json(result); } catch (error) { return apiError(error); } }
