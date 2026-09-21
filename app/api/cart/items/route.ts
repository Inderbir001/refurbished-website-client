import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sessionFromRequest } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { addCartItem, addCartItemLite, cartTotals, changeCartItem } from "@/lib/services/cart-service";
const guestCookie = "guest_cart";
const postSchema = z.object({ productId: z.string().cuid(), variantId: z.string().cuid().optional(), quantity: z.number().int().min(1).max(10), lite: z.boolean().optional() });
const patchSchema = z.object({ itemId: z.string().cuid(), quantity: z.number().int().min(0).max(10) });
async function actor(request: NextRequest) { const session = await sessionFromRequest(request); return { actor: session ? { userId: session.sub } : { sessionToken: request.cookies.get(guestCookie)?.value ?? crypto.randomUUID() }, freshGuest: !session && !request.cookies.get(guestCookie)?.value }; }
async function response(cart: Awaited<ReturnType<typeof addCartItem>>, userId?: string, token?: string) { const result = NextResponse.json({ data: { ...cart, totals: await cartTotals(cart, userId) } }); if (token) result.cookies.set(guestCookie, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 }); return result; }
function guestCookieOn(result: NextResponse, token?: string) { if (token) result.cookies.set(guestCookie, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 }); return result; }
export async function POST(request: NextRequest) { try { const identity = await actor(request); const { lite, ...input } = postSchema.parse(await request.json()); if (lite) { const quantity = await addCartItemLite(identity.actor, input); return guestCookieOn(NextResponse.json({ data: { items: [{ quantity }] } }), identity.freshGuest ? identity.actor.sessionToken : undefined); } const cart = await addCartItem(identity.actor, input); return response(cart, identity.actor.userId, identity.freshGuest ? identity.actor.sessionToken : undefined); } catch (error) { return apiError(error); } }
export async function PATCH(request: NextRequest) { try { const identity = await actor(request); const input = patchSchema.parse(await request.json()); const cart = await changeCartItem(identity.actor, input.itemId, input.quantity); return response(cart, identity.actor.userId, identity.freshGuest ? identity.actor.sessionToken : undefined); } catch (error) { return apiError(error); } }
