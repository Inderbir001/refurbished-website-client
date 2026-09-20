import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { csvCell } from "@/lib/csv";
export async function GET(request: NextRequest) { try { await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER]); const variants = await db.productVariant.findMany({ include: { product: true }, orderBy: { sku: "asc" } }); const rows = [["product","productSku","variant","variantSku","stock","lowStockThreshold","weightGrams"], ...variants.map((variant) => [variant.product.name, variant.product.sku, variant.title, variant.sku, variant.stock, variant.lowStockThreshold, variant.weightGrams ?? ""])]; return new NextResponse(rows.map((row) => row.map(csvCell).join(",")).join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=refurbshield-inventory.csv" } }); } catch (error) { return apiError(error); } }
