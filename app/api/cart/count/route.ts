import { NextRequest } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { cartItemCount } from "@/lib/services/cart-service";

export async function GET(request: NextRequest) {
  try {
    const session = await sessionFromRequest(request);
    const count = await cartItemCount(session ? { userId: session.sub } : { sessionToken: request.cookies.get("guest_cart")?.value });
    return json({ count });
  } catch (error) { return apiError(error); }
}
