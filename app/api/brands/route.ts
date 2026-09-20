import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";

export async function GET() { try { return json(await db.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } })); } catch (error) { return apiError(error); } }
