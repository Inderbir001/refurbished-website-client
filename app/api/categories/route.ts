import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";

export async function GET() { try { return json(await db.category.findMany({ where: { isVisible: true }, orderBy: [{ position: "asc" }, { name: "asc" }], include: { children: { where: { isVisible: true }, orderBy: { position: "asc" } }, _count: { select: { products: true } } } })); } catch (error) { return apiError(error); } }
