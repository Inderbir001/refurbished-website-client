import { db } from "../db";
import { dealOf } from "../money";
import type { OfferRow } from "./offer-service";

// Same price the storefront shows (dealOf on the first variant), so the admin table matches what customers see.
export async function loadOfferRows(): Promise<OfferRow[]> {
  const products = await db.product.findMany({
    where: { deletedAt: null },
    include: { category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } }, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } }, variants: { select: { price: true, salePrice: true } } },
    orderBy: { name: "asc" },
  });
  return products.map((product) => {
    const deal = dealOf(product);
    return { id: product.id, name: product.name, sku: product.sku, image: product.images[0]?.url ?? null, categoryId: product.category?.id ?? null, category: product.category?.name ?? "—", brandId: product.brand?.id ?? null, brand: product.brand?.name ?? "—", condition: product.condition, status: product.status, original: deal.original, price: deal.price, percent: deal.percent };
  });
}
