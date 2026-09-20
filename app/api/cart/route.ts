import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { cartTotals, getCart } from "@/lib/services/cart-service";
const guestCookie = "guest_cart";
export async function GET(request: NextRequest) { try { const session = await sessionFromRequest(request); const sessionToken = request.cookies.get(guestCookie)?.value ?? crypto.randomUUID(); const cart = await getCart(session ? { userId: session.sub } : { sessionToken }); const response = NextResponse.json({ data: { ...cart, totals: await cartTotals(cart, session?.sub) } }); if (!session && !request.cookies.get(guestCookie)) response.cookies.set(guestCookie, sessionToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 }); return response; } catch (error) { return apiError(error); } }
