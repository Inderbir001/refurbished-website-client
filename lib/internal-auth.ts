import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isFrontendOnly } from "./remote";

// Guard for /api/internal/*: only the frontend's server may call these, using a shared secret.
// If no secret is configured (or this is the frontend itself) the endpoints simply do not exist.
export function internalGuard(request: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET;
  const notFound = NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!secret || secret.length < 24 || isFrontendOnly()) return notFound;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return notFound;
  return null;
}
