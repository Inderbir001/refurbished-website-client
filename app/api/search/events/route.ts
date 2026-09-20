import { NextRequest } from "next/server";
import { z } from "zod";
import { sessionFromRequest } from "@/lib/auth";
import { listProducts } from "@/lib/catalog";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";
export async function POST(request: NextRequest) { try { const { query } = z.object({ query: z.string().trim().min(2).max(120) }).parse(await request.json()); const [session, store, products] = await Promise.all([sessionFromRequest(request), db.store.findFirst({ select: { id: true } }), listProducts({ q: query })]); if (store) await db.searchEvent.create({ data: { storeId: store.id, userId: session?.sub, sessionToken: request.cookies.get("guest_cart")?.value, query, resultCount: products.length } }); return json({ recorded: true }); } catch (error) { return apiError(error); } }
