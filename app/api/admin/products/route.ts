import { InventoryReason, ProductCondition, ProductStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { assertValidProductPricing } from "@/lib/services/product-service";

const optionalCuid = z.preprocess((value) => value === "" ? undefined : value, z.string().cuid().optional());
const optionalUrl = z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional());
const schema = z.object({
  storeId: z.string().cuid(), name: z.string().trim().min(3), slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(20), sku: z.string().trim().min(3), basePrice: z.number().int().positive(),
  salePrice: z.number().int().positive().optional(), condition: z.nativeEnum(ProductCondition),
  categoryId: optionalCuid, brandId: optionalCuid, warrantyMonths: z.number().int().min(0).max(60).default(0),
  variantTitle: z.string().trim().min(1).default("Standard"), stock: z.number().int().min(0), imageUrl: optionalUrl,
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const input = schema.parse(await request.json());
    assertValidProductPricing(input);
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          storeId: input.storeId, name: input.name, slug: input.slug, description: input.description,
          sku: input.sku, basePrice: input.basePrice, salePrice: input.salePrice, condition: input.condition,
          categoryId: input.categoryId, brandId: input.brandId, warrantyMonths: input.warrantyMonths,
          status: ProductStatus.ACTIVE,
          variants: { create: { title: input.variantTitle, sku: `${input.sku}-DEFAULT`, stock: input.stock } },
          images: input.imageUrl ? { create: { url: input.imageUrl, alt: input.name } } : undefined,
        },
        include: { variants: true },
      });
      const variant = created.variants[0];
      await tx.inventoryTransaction.create({ data: { variantId: variant.id, quantityDelta: input.stock, previousStock: 0, resultingStock: input.stock, reason: InventoryReason.INITIAL_STOCK, actorId: admin.sub } });
      await tx.auditLog.create({ data: { actorId: admin.sub, action: "PRODUCT_CREATED", entityType: "Product", entityId: created.id, after: { name: created.name } } });
      return created;
    });
    return json(product, 201);
  } catch (error) { return apiError(error); }
}
