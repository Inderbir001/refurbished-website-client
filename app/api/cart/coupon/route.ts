import { NextRequest } from "next/server";
import { z } from "zod";
import { sessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { cartTotals, couponLines, getCart } from "@/lib/services/cart-service";
import { validateCouponForCart } from "@/lib/services/coupon-service";
async function identity(request: NextRequest) { const session = await sessionFromRequest(request); const token = request.cookies.get("guest_cart")?.value; if (!session && !token) throw new AppError(400, "Your cart is empty."); return { actor: session ? { userId: session.sub } : { sessionToken: token }, userId: session?.sub }; }
export async function PATCH(request: NextRequest) { try { const { code } = z.object({ code: z.string().trim().min(1).max(40) }).parse(await request.json()); const person = await identity(request); const cart = await getCart(person.actor); await validateCouponForCart(code, couponLines(cart), person.userId); const updated = await db.cart.update({ where: { id: cart.id }, data: { couponCode: code.toUpperCase() }, include: { items: { include: { product: { include: { images: { take: 1 }, brand: true, collections: { select: { collectionId: true } } } }, variant: true } } } }); return json({ ...updated, totals: await cartTotals(updated, person.userId) }); } catch (error) { return apiError(error); } }
export async function DELETE(request: NextRequest) { try { const person = await identity(request); const cart = await getCart(person.actor); await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } }); return json({ removed: true }); } catch (error) { return apiError(error); } }
