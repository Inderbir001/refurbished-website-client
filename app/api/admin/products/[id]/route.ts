import { InventoryReason, ProductCondition, ProductStatus, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";

const variantSchema = z.object({ id: z.string().cuid().optional(), title: z.string().trim().min(1), sku: z.string().trim().min(3), barcode: z.string().trim().optional().nullable(), price: z.number().int().positive().optional().nullable(), salePrice: z.number().int().positive().optional().nullable(), stock: z.number().int().min(0), lowStockThreshold: z.number().int().min(0).default(2), weightGrams: z.number().int().positive().optional().nullable(), attributes: z.record(z.string()).optional() });
const imageSchema = z.object({ url: z.string().url(), alt: z.string().trim().max(200).optional(), position: z.number().int().min(0) });
const schema = z.object({ name: z.string().trim().min(3), slug: z.string().regex(/^[a-z0-9-]+$/), description: z.string().trim().min(20), sku: z.string().trim().min(3), basePrice: z.number().int().positive(), salePrice: z.number().int().positive().optional().nullable(), costPrice: z.number().int().positive().optional().nullable(), taxRate: z.number().int().min(0).max(50), condition: z.nativeEnum(ProductCondition), status: z.nativeEnum(ProductStatus), categoryId: z.string().cuid().optional().nullable(), brandId: z.string().cuid().optional().nullable(), warrantyMonths: z.number().int().min(0).max(60), tags: z.array(z.string().trim().min(1)).max(30).default([]), grade: z.string().trim().max(50).optional().nullable(), whatsIncluded: z.string().trim().max(2000).optional().nullable(), specifications: z.record(z.string()).optional(), dimensions: z.record(z.string()).optional(), seoTitle: z.string().trim().max(70).optional().nullable(), seoDescription: z.string().trim().max(170).optional().nullable(), variants: z.array(variantSchema).min(1), images: z.array(imageSchema).max(20) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]);
    const id = (await context.params).id;
    const input = schema.parse(await request.json());
    if (input.salePrice && input.salePrice >= input.basePrice) throw new AppError(400, "Sale price must be lower than the regular price.");
    const before = await db.product.findUnique({ where: { id }, include: { variants: true } });
    if (!before) throw new AppError(404, "Product not found.");
    const updated = await db.$transaction(async (tx) => {
      const existingIds = new Set(before.variants.map((variant) => variant.id));
      const submittedIds = new Set(input.variants.flatMap((variant) => variant.id ? [variant.id] : []));
      for (const existing of before.variants) if (!submittedIds.has(existing.id)) {
        const linked = await tx.orderItem.count({ where: { variantId: existing.id } });
        if (linked) throw new AppError(409, `Variant ${existing.sku} appears in an order and cannot be deleted.`);
        await tx.productVariant.delete({ where: { id: existing.id } });
      }
      for (const variant of input.variants) {
        if (variant.id && !existingIds.has(variant.id)) throw new AppError(400, "A submitted variant does not belong to this product.");
        if (variant.id) {
          const previous = before.variants.find((item) => item.id === variant.id)!;
          await tx.productVariant.update({ where: { id: variant.id }, data: { title: variant.title, sku: variant.sku, barcode: variant.barcode, price: variant.price, salePrice: variant.salePrice, stock: variant.stock, lowStockThreshold: variant.lowStockThreshold, weightGrams: variant.weightGrams, attributes: variant.attributes } });
          if (previous.stock !== variant.stock) await tx.inventoryTransaction.create({ data: { variantId: variant.id, quantityDelta: variant.stock - previous.stock, previousStock: previous.stock, resultingStock: variant.stock, reason: InventoryReason.ADJUSTMENT, reference: "Product editor", actorId: admin.sub } });
        } else {
          const created = await tx.productVariant.create({ data: { productId: id, title: variant.title, sku: variant.sku, barcode: variant.barcode, price: variant.price, salePrice: variant.salePrice, stock: variant.stock, lowStockThreshold: variant.lowStockThreshold, weightGrams: variant.weightGrams, attributes: variant.attributes } });
          await tx.inventoryTransaction.create({ data: { variantId: created.id, quantityDelta: variant.stock, previousStock: 0, resultingStock: variant.stock, reason: InventoryReason.INITIAL_STOCK, reference: "Product editor", actorId: admin.sub } });
        }
      }
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (input.images.length) await tx.productImage.createMany({ data: input.images.map((image) => ({ ...image, productId: id })) });
      const product = await tx.product.update({ where: { id }, data: { name: input.name, slug: input.slug, description: input.description, sku: input.sku, basePrice: input.basePrice, salePrice: input.salePrice, costPrice: input.costPrice, taxRate: input.taxRate, condition: input.condition, status: input.status, categoryId: input.categoryId, brandId: input.brandId, warrantyMonths: input.warrantyMonths, tags: input.tags, grade: input.grade, whatsIncluded: input.whatsIncluded, specifications: input.specifications, dimensions: input.dimensions, seoTitle: input.seoTitle, seoDescription: input.seoDescription, deletedAt: null } });
      await tx.auditLog.create({ data: { actorId: admin.sub, action: "PRODUCT_UPDATED", entityType: "Product", entityId: id, before: { name: before.name, basePrice: before.basePrice, salePrice: before.salePrice, status: before.status }, after: { name: product.name, basePrice: product.basePrice, salePrice: product.salePrice, status: product.status } } });
      return product;
    });
    return json(updated);
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) { try { const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]); const id = (await context.params).id; const product = await db.product.update({ where: { id }, data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED } }); await db.auditLog.create({ data: { actorId: admin.sub, action: "PRODUCT_DELETED", entityType: "Product", entityId: id, before: { status: product.status } } }); return json({ deleted: true }); } catch (error) { return apiError(error); } }

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) { try { const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]); const id = (await context.params).id; const source = await db.product.findUnique({ where: { id }, include: { variants: true, images: true } }); if (!source) throw new AppError(404, "Product not found."); const suffix = Date.now().toString(36); const copy = await db.product.create({ data: { storeId: source.storeId, categoryId: source.categoryId, brandId: source.brandId, sellerId: source.sellerId, name: `${source.name} Copy`, slug: `${source.slug}-copy-${suffix}`, description: source.description, condition: source.condition, status: ProductStatus.DRAFT, basePrice: source.basePrice, salePrice: source.salePrice, costPrice: source.costPrice, taxRate: source.taxRate, sku: `${source.sku}-COPY-${suffix}`.toUpperCase(), warrantyMonths: source.warrantyMonths, specifications: source.specifications ?? undefined, dimensions: source.dimensions ?? undefined, tags: source.tags, grade: source.grade, whatsIncluded: source.whatsIncluded, seoTitle: source.seoTitle, seoDescription: source.seoDescription, variants: { create: source.variants.map((variant) => ({ title: variant.title, sku: `${variant.sku}-COPY-${suffix}`.toUpperCase(), barcode: null, price: variant.price, salePrice: variant.salePrice, stock: 0, lowStockThreshold: variant.lowStockThreshold, weightGrams: variant.weightGrams, attributes: variant.attributes ?? undefined })) }, images: { create: source.images.map((image) => ({ url: image.url, alt: image.alt, position: image.position })) } } }); await db.auditLog.create({ data: { actorId: admin.sub, action: "PRODUCT_DUPLICATED", entityType: "Product", entityId: copy.id, after: { sourceId: source.id } } }); return json(copy, 201); } catch (error) { return apiError(error); } }
