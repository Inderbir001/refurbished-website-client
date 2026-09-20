import { getProduct } from "@/lib/catalog";
import { AppError, apiError, json } from "@/lib/http";
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) { try { const product = await getProduct((await context.params).id); if (!product) throw new AppError(404, "Product not found."); return json(product); } catch (error) { return apiError(error); } }
