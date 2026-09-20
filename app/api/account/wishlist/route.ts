import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";
const schema = z.object({ productId: z.string().cuid() });
export async function GET(request: NextRequest) { try { const session = await requireSession(request); return json(await db.wishlistItem.findMany({ where: { userId: session.sub }, include: { product: { include: { brand: true, images: { take: 1, orderBy: { position: "asc" } }, variants: true } } }, orderBy: { createdAt: "desc" } })); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) { try { const session = await requireSession(request); const { productId } = schema.parse(await request.json()); return json(await db.wishlistItem.upsert({ where: { userId_productId: { userId: session.sub, productId } }, update: {}, create: { userId: session.sub, productId } }), 201); } catch (error) { return apiError(error); } }
export async function DELETE(request: NextRequest) { try { const session = await requireSession(request); const { productId } = schema.parse(await request.json()); await db.wishlistItem.deleteMany({ where: { userId: session.sub, productId } }); return json({ removed: true }); } catch (error) { return apiError(error); } }
