import { NextRequest } from "next/server";
import { z } from "zod";
import { sessionFromRequest } from "@/lib/auth";
import { apiError, AppError, json } from "@/lib/http";
import { placesEnabled, suggest } from "@/lib/places";
import { assertRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ input: z.string().trim().min(3).max(120), sessionToken: z.string().min(8).max(64) });
export async function POST(request: NextRequest) {
  try {
    const session = await sessionFromRequest(request);
    if (!session) throw new AppError(401, "Please sign in to continue.");
    if (!placesEnabled()) return json({ enabled: false, suggestions: [] });
    assertRateLimit(`places:${session.sub}`, 90, 60_000);
    const { input, sessionToken } = bodySchema.parse(await request.json());
    return json({ enabled: true, suggestions: await suggest(input, sessionToken) });
  } catch (error) { return apiError(error); }
}
