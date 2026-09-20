import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Built on request (not at build time) so new products appear and the build never needs the database.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const [products, categories] = await Promise.all([db.product.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { slug: true, updatedAt: true } }), db.category.findMany({ where: { isVisible: true }, select: { slug: true } })]);
  return [{ url: base, changeFrequency: "daily", priority: 1 }, { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 }, ...products.map((product) => ({ url: `${base}/products/${product.slug}`, lastModified: product.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })), ...categories.map((category) => ({ url: `${base}/category/${category.slug}`, changeFrequency: "weekly" as const, priority: 0.7 }))];
}
