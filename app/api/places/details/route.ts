import { NextRequest } from "next/server";
import { z } from "zod";
import { sessionFromRequest } from "@/lib/auth";
import { apiError, AppError, json } from "@/lib/http";
import { placeAddress, placesEnabled } from "@/lib/places";
import { assertRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ placeId: z.string().min(5).max(300), sessionToken: z.string().min(8).max(64) });
export async function POST(request: NextRequest) {
  try {
    const session = await sessionFromRequest(request);
    if (!session) throw new AppError(401, "Please sign in to continue.");
    if (!placesEnabled()) throw new AppError(503, "Address search is not set up.");
    assertRateLimit(`places:${session.sub}`, 90, 60_000);
    const { placeId, sessionToken } = bodySchema.parse(await request.json());
    return json({ address: await placeAddress(placeId, sessionToken) });
  } catch (error) { return apiError(error); }
}
