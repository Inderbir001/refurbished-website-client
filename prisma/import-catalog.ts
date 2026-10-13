// Replaces the store's catalog (products, categories, brands, collections) with a catalog.json produced by
// prisma/catalog/storehippo-to-catalog.py.
//
//   npx tsx prisma/import-catalog.ts <catalog.json>             # dry run: prints what would change, changes nothing
//   npx tsx prisma/import-catalog.ts <catalog.json> --replace   # does it, all or nothing (one transaction)
//
// Orders are never touched. A product that already appears in an order is archived (hidden, kept) instead of
// deleted, so order history stays intact. The database is whatever DATABASE_URL points at.
import { readFileSync } from "node:fs";
import { PrismaClient, ProductCondition, ProductStatus } from "@prisma/client";

type CatalogProduct = {
  name: string; slug: string; sku: string; description: string; condition: ProductCondition; status: ProductStatus;
  basePrice: number; salePrice: number | null; categorySlug: string; brandSlug: string; stock: number; variantTitle: string;
  warrantyMonths: number; specifications: Record<string, string>; tags: string[]; seoTitle: string | null; seoDescription: string | null;
  collectionSlugs: string[]; images: string[];
};
type Catalog = {
  parentCategory: { slug: string; name: string };
  categories: { slug: string; name: string; position: number }[];
  brands: { slug: string; name: string }[];
  collections: { slug: string; name: string }[];
  products: CatalogProduct[];
};

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error("Usage: npx tsx prisma/import-catalog.ts <catalog.json> [--replace]"); process.exit(1); }
const replace = flags.includes("--replace");
const catalog = JSON.parse(readFileSync(file, "utf8")) as Catalog;
const db = new PrismaClient();

// Same words the admin shows, so a re-run is recognisable in the activity log.
const AUDIT = "CATALOG_REPLACED";

function validate() {
  const problems: string[] = [];
  const dup = (values: string[], label: string) => { const seen = new Set<string>(); for (const v of values) { if (seen.has(v)) problems.push(`duplicate ${label}: ${v}`); seen.add(v); } };
  dup(catalog.products.map((p) => p.sku), "sku"); dup(catalog.products.map((p) => p.slug), "slug");
  const cats = new Set(catalog.categories.map((c) => c.slug)); const brands = new Set(catalog.brands.map((b) => b.slug)); const colls = new Set(catalog.collections.map((c) => c.slug));
  for (const p of catalog.products) {
    if (!/^[a-z0-9-]+$/.test(p.slug)) problems.push(`bad slug: ${p.slug}`);
    if (!cats.has(p.categorySlug)) problems.push(`${p.sku}: unknown category ${p.categorySlug}`);
    if (!brands.has(p.brandSlug)) problems.push(`${p.sku}: unknown brand ${p.brandSlug}`);
    for (const c of p.collectionSlugs) if (!colls.has(c)) problems.push(`${p.sku}: unknown collection ${c}`);
    if (!(p.basePrice > 0)) problems.push(`${p.sku}: bad price`);
    if (p.salePrice !== null && p.salePrice >= p.basePrice) problems.push(`${p.sku}: sale price is not below the price`);
  }
  return problems;
}

async function main() {
  const problems = validate();
  if (problems.length) { console.error("The catalog file has problems, nothing was changed:\n - " + problems.join("\n - ")); process.exit(1); }

  const store = await db.store.findFirstOrThrow();
  const existing = await db.product.findMany({ where: { storeId: store.id }, select: { id: true, name: true, status: true, _count: { select: { orderItems: true } } } });
  const keep = existing.filter((p) => p._count.orderItems > 0); // referenced by orders: archive
  const remove = existing.filter((p) => p._count.orderItems === 0);
  const host = (process.env.DATABASE_URL ?? "").replace(/^[a-z]+:\/\/[^@]*@/, "").split("/")[0];
  console.log(`Target database: ${host}`);
  console.log(`Store "${store.name}": ${existing.length} products now -> ${remove.length} deleted, ${keep.length} archived (they appear in orders)`);
  console.log(`New catalog: ${catalog.products.length} products (${catalog.products.filter((p) => p.status === "ACTIVE").length} live, ${catalog.products.filter((p) => p.status !== "ACTIVE").length} drafts), ${catalog.categories.length} categories, ${catalog.brands.length} brands, ${catalog.collections.length} collections`);
  if (!replace) { console.log("Dry run only. Add --replace to apply."); return; }

  const taken = await db.product.findMany({ where: { id: { in: keep.map((p) => p.id) } }, select: { slug: true, sku: true } });
  const clash = catalog.products.filter((p) => taken.some((t) => t.slug === p.slug || t.sku === p.sku));
  if (clash.length) throw new Error(`These new products clash with archived ones (slug/sku): ${clash.map((p) => p.sku).join(", ")}`);

  const actor = await db.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  const result = await db.$transaction(async (tx) => {
    // 1. old catalog out
    const removeIds = remove.map((p) => p.id);
    await tx.cartItem.deleteMany({ where: { productId: { in: removeIds } } });
    await tx.product.deleteMany({ where: { id: { in: removeIds } } });
    for (const p of keep) await tx.product.update({ where: { id: p.id }, data: { status: ProductStatus.ARCHIVED, deletedAt: new Date() } });
    await tx.cartItem.deleteMany({ where: { productId: { in: keep.map((p) => p.id) } } }); // archived products can't be bought: drop them from carts
    await tx.collection.deleteMany({ where: { storeId: store.id } });
    await tx.brand.deleteMany({ where: { storeId: store.id } });
    await tx.category.deleteMany({ where: { storeId: store.id, parentId: { not: null } } });
    await tx.category.deleteMany({ where: { storeId: store.id, slug: { not: catalog.parentCategory.slug } } });

    // 2. new structure
    const parent = await tx.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: catalog.parentCategory.slug } },
      update: { name: catalog.parentCategory.name, isVisible: true },
      create: { storeId: store.id, slug: catalog.parentCategory.slug, name: catalog.parentCategory.name, isVisible: true },
    });
    const categoryId = new Map<string, string>(); const brandId = new Map<string, string>(); const collectionId = new Map<string, string>();
    for (const c of catalog.categories) categoryId.set(c.slug, (await tx.category.create({ data: { storeId: store.id, parentId: parent.id, slug: c.slug, name: c.name, position: c.position, isVisible: true } })).id);
    for (const b of catalog.brands) brandId.set(b.slug, (await tx.brand.create({ data: { storeId: store.id, slug: b.slug, name: b.name, isActive: true } })).id);
    for (const c of catalog.collections) collectionId.set(c.slug, (await tx.collection.create({ data: { storeId: store.id, slug: c.slug, name: c.name, isActive: true } })).id);

    // 3. products
    let variants = 0, images = 0;
    for (const p of catalog.products) {
      const product = await tx.product.create({
        data: {
          storeId: store.id, name: p.name, slug: p.slug, sku: p.sku, description: p.description, condition: p.condition, status: p.status,
          basePrice: p.basePrice, salePrice: p.salePrice, categoryId: categoryId.get(p.categorySlug), brandId: brandId.get(p.brandSlug),
          warrantyMonths: p.warrantyMonths, specifications: p.specifications, tags: p.tags, seoTitle: p.seoTitle, seoDescription: p.seoDescription,
          images: { create: p.images.map((url, position) => ({ url, alt: p.name, position })) },
          variants: { create: [{ title: p.variantTitle, sku: `${p.sku}-1`, stock: p.stock }] },
        },
        include: { variants: true },
      });
      variants += product.variants.length; images += p.images.length;
      await tx.inventoryTransaction.create({ data: { variantId: product.variants[0].id, quantityDelta: p.stock, previousStock: 0, resultingStock: p.stock, reason: "INITIAL_STOCK", reference: "CATALOG_IMPORT", actorId: actor?.id } });
      for (const slug of p.collectionSlugs) await tx.productCollection.create({ data: { productId: product.id, collectionId: collectionId.get(slug)! } });
    }

    // 4. category-scoped coupons pointed at categories that no longer exist: point them at the new accessory categories
    const accessorySlugs = ["cable", "charger", "adapter", "power-bank", "mouse", "gaming-accessories"].filter((s) => categoryId.has(s));
    const rescoped = await tx.coupon.updateMany({ where: { scopeType: "CATEGORY" }, data: { scopeIds: accessorySlugs.map((s) => categoryId.get(s)!) } });

    await tx.auditLog.create({ data: { actorId: actor?.id, action: AUDIT, entityType: "Store", entityId: store.id, after: { products: catalog.products.length, deleted: remove.length, archived: keep.length, couponsRescoped: rescoped.count } } });
    return { variants, images, rescoped: rescoped.count, accessorySlugs };
  }, { timeout: 5 * 60_000, maxWait: 30_000 });

  const live = await db.product.count({ where: { storeId: store.id, status: "ACTIVE", deletedAt: null } });
  console.log(`Done. ${catalog.products.length} products (${live} live), ${result.variants} variants, ${result.images} images. Category coupons re-scoped: ${result.rescoped} -> ${result.accessorySlugs.join(", ")}`);
}

main().then(() => db.$disconnect()).catch(async (error) => { console.error("FAILED, nothing was changed:", error.message); await db.$disconnect(); process.exit(1); });
