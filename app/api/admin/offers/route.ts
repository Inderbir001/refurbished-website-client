import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";
import { salePriceFor } from "@/lib/services/offer-service";
import { loadOfferRows } from "@/lib/services/offer-rows";

const roles = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER];
const ids = z.array(z.string().cuid()).min(1).max(500);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("APPLY_PERCENT"), productIds: ids, percent: z.number().int().min(1).max(90) }),
  z.object({ action: z.literal("CLEAR"), productIds: ids }),
]);

export async function GET(request: NextRequest) {
  try { await requireAdmin(request, roles); return json({ rows: await loadOfferRows() }); } catch (error) { return apiError(error); }
}

// A "deal" is a sale price below the regular price. Variants that carry their own price are discounted from that price,
// because a variant's own price always wins over the product's on the storefront.
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request, roles);
    const input = schema.parse(await request.json());
    const products = await db.product.findMany({ where: { id: { in: input.productIds }, deletedAt: null }, select: { id: true, basePrice: true, variants: { select: { id: true, price: true, salePrice: true } } } });
    const operations = [];
    let skipped = 0;
    for (const product of products) {
      if (input.action === "CLEAR") {
        operations.push(db.product.update({ where: { id: product.id }, data: { salePrice: null } }));
        for (const variant of product.variants) if (variant.salePrice !== null) operations.push(db.productVariant.update({ where: { id: variant.id }, data: { salePrice: null } }));
        continue;
      }
      const sale = salePriceFor(product.basePrice, input.percent);
      if (sale === null) { skipped += 1; continue; }
      operations.push(db.product.update({ where: { id: product.id }, data: { salePrice: sale } }));
      for (const variant of product.variants) {
        const regular = variant.price ?? (variant.salePrice !== null ? product.basePrice : null);
        if (regular === null) continue;
        operations.push(db.productVariant.update({ where: { id: variant.id }, data: { salePrice: salePriceFor(regular, input.percent) } }));
      }
    }
    await db.$transaction([...operations, db.auditLog.create({ data: { actorId: admin.sub, action: input.action === "CLEAR" ? "OFFERS_CLEARED" : "OFFERS_APPLIED", entityType: "Product", entityId: "bulk", after: { products: products.length - skipped, percent: input.action === "APPLY_PERCENT" ? input.percent : null, productIds: input.productIds } } })]);
    return json({ updated: products.length - skipped, skipped, rows: await loadOfferRows() });
  } catch (error) { return apiError(error); }
}
