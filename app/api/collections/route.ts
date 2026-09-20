import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";

export async function GET() { try { return json(await db.collection.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { products: { orderBy: { position: "asc" }, include: { product: { select: { id: true, name: true, slug: true, basePrice: true, salePrice: true, status: true } } } } } })); } catch (error) { return apiError(error); } }
