import { NextRequest } from "next/server";
import { z } from "zod";
import { verifySessionLocally } from "@/lib/auth";
import { internalGuard } from "@/lib/internal-auth";
import { apiError, json } from "@/lib/http";

// The frontend never sees AUTH_SECRET: it hands the session cookie to the backend to be checked.
export async function POST(request: NextRequest) {
  const denied = internalGuard(request);
  if (denied) return denied;
  try {
    const { token } = z.object({ token: z.string().min(10).max(4000) }).parse(await request.json());
    return json(await verifySessionLocally(token));
  } catch (error) { return apiError(error); }
}
