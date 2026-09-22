import { NextRequest } from "next/server";
import { z } from "zod";
import { sessionFromRequest } from "@/lib/auth";
import { apiError, AppError, json } from "@/lib/http";
import { priceFor } from "@/lib/money";
import { couponLines, getCart } from "@/lib/services/cart-service";
import { validateCouponForCart } from "@/lib/services/coupon-service";
import { quoteShippingOptions } from "@/lib/services/shipping-service";

// Lets the checkout page show real, selectable delivery options as the shopper fills in their address, instead of
// a placeholder that never reflected the rules configured in Admin > Delivery.
const bodySchema = z.object({ state: z.string().trim().min(2), pincode: z.string().regex(/^\d{6}$/) });
export async function POST(request: NextRequest) {
  try {
    const session = await sessionFromRequest(request);
    if (!session) throw new AppError(401, "Please sign in to continue.");
    const input = bodySchema.parse(await request.json());
    const cart = await getCart({ userId: session.sub });
    if (!cart.items.length) throw new AppError(400, "Your cart is empty.");
    const subtotal = cart.items.reduce((sum, item) => sum + priceFor(item.variant ?? { price: null, salePrice: null }, item.product) * item.quantity, 0);
    let discount = 0;
    if (cart.couponCode) { try { discount = (await validateCouponForCart(cart.couponCode, couponLines(cart), session.sub)).discount; } catch { /* a stale coupon just means no discount here either; checkout itself drops it */ } }
    const options = await quoteShippingOptions({ state: input.state, pincode: input.pincode, subtotal: subtotal - discount });
    return json({ options });
  } catch (error) { return apiError(error); }
}
