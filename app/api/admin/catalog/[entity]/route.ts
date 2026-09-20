import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";

const base = z.object({ id: z.string().cuid().optional(), name: z.string().trim().min(2).max(120), slug: z.string().regex(/^[a-z0-9-]+$/), description: z.string().trim().max(2000).optional(), imageUrl: z.string().url().optional().or(z.literal("")), seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional() });
const categorySchema = base.extend({ parentId: z.string().cuid().optional().or(z.literal("")), isVisible: z.boolean().default(true), position: z.number().int().min(0).default(0) });
const brandSchema = base.extend({ logoUrl: z.string().url().optional().or(z.literal("")), isActive: z.boolean().default(true) });
const collectionSchema = base.extend({ isActive: z.boolean().default(true), productIds: z.array(z.string().cuid()).default([]) });

function entityName(entity: string) { if (entity === "categories") return "Category"; if (entity === "brands") return "Brand"; if (entity === "collections") return "Collection"; throw new AppError(404, "Unknown catalog entity."); }

async function write(request: NextRequest, context: { params: Promise<{ entity: string }> }, update: boolean) {
  const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]);
  const entity = (await context.params).entity;
  const store = await db.store.findFirst();
  if (!store) throw new AppError(409, "Store setup is incomplete.");
  const raw = await request.json();
  let record: { id: string };
  if (entity === "categories") {
    const input = categorySchema.parse(raw);
    const data = { storeId: store.id, name: input.name, slug: input.slug, description: input.description, imageUrl: input.imageUrl || null, seoTitle: input.seoTitle, seoDescription: input.seoDescription, parentId: input.parentId || null, isVisible: input.isVisible, position: input.position };
    record = update && input.id ? await db.category.update({ where: { id: input.id }, data }) : await db.category.create({ data });
  } else if (entity === "brands") {
    const input = brandSchema.parse(raw);
    const data = { storeId: store.id, name: input.name, slug: input.slug, description: input.description, logoUrl: input.logoUrl || null, isActive: input.isActive };
    record = update && input.id ? await db.brand.update({ where: { id: input.id }, data }) : await db.brand.create({ data });
  } else if (entity === "collections") {
    const input = collectionSchema.parse(raw);
    const data = { storeId: store.id, name: input.name, slug: input.slug, description: input.description, imageUrl: input.imageUrl || null, seoTitle: input.seoTitle, seoDescription: input.seoDescription, isActive: input.isActive };
    record = await db.$transaction(async (tx) => {
      const item = update && input.id ? await tx.collection.update({ where: { id: input.id }, data }) : await tx.collection.create({ data });
      await tx.productCollection.deleteMany({ where: { collectionId: item.id } });
      if (input.productIds.length) await tx.productCollection.createMany({ data: input.productIds.map((productId, position) => ({ collectionId: item.id, productId, position })) });
      return item;
    });
  } else throw new AppError(404, "Unknown catalog entity.");
  await db.auditLog.create({ data: { actorId: admin.sub, action: `${entityName(entity).toUpperCase()}_${update ? "UPDATED" : "CREATED"}`, entityType: entityName(entity), entityId: record.id, after: { source: "admin" } } });
  return record;
}

export async function POST(request: NextRequest, context: { params: Promise<{ entity: string }> }) { try { return json(await write(request, context, false), 201); } catch (error) { return apiError(error); } }
export async function PATCH(request: NextRequest, context: { params: Promise<{ entity: string }> }) { try { return json(await write(request, context, true)); } catch (error) { return apiError(error); } }
export async function DELETE(request: NextRequest, context: { params: Promise<{ entity: string }> }) {
  try {
    const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]);
    const entity = (await context.params).entity;
    const id = z.string().cuid().parse(new URL(request.url).searchParams.get("id"));
    if (entity === "categories") {
      const linked = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
      if (!linked) throw new AppError(404, "Category not found.");
      if (linked._count.products || linked._count.children) throw new AppError(409, "Move linked products and child categories before deleting this category.");
      await db.category.delete({ where: { id } });
    } else if (entity === "brands") await db.brand.delete({ where: { id } });
    else if (entity === "collections") await db.collection.delete({ where: { id } });
    else throw new AppError(404, "Unknown catalog entity.");
    await db.auditLog.create({ data: { actorId: admin.sub, action: `${entityName(entity).toUpperCase()}_DELETED`, entityType: entityName(entity), entityId: id } });
    return json({ deleted: true });
  } catch (error) { return apiError(error); }
}
