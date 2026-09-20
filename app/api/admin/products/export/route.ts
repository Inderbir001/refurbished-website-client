import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { toCsv } from "@/lib/csv";
export async function GET(request: NextRequest) { try { await requireAdmin(request); const products = await db.product.findMany({ where: { deletedAt: null }, include: { category: true, brand: true, variants: true }, orderBy: { name: "asc" } }); const rows: unknown[][] = [["name", "slug", "sku", "condition", "status", "basePriceINR", "salePriceINR", "category", "brand", "variant", "variantSku", "stock"]]; for (const product of products) for (const variant of product.variants) rows.push([product.name, product.slug, product.sku, product.condition, product.status, product.basePrice / 100, product.salePrice ? product.salePrice / 100 : "", product.category?.name, product.brand?.name, variant.title, variant.sku, variant.stock]); return new Response(toCsv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="refurbshield-products.csv"' } }); } catch (error) { return apiError(error); } }
