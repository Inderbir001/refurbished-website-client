import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";
import { normalizeIndianPhone } from "@/lib/phone";
import { assertRateLimit } from "@/lib/rate-limit";

// Step 1 of the no-email reset path: given a phone number (or email), returns the account's security question,
// so it can be answered client-side. Always 200, and the response looks the same whether or not the account
// exists — only "question: <text>" vs "question: null" differs, and null covers both "no such account" and
// "account exists but never set one".
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    assertRateLimit(`security-question:${ip}`, 10, 15 * 60_000);
    const { identifier } = z.object({ identifier: z.string().trim().min(1) }).parse(await request.json());
    const byEmail = identifier.includes("@");
    const phone = byEmail ? "" : String(normalizeIndianPhone(identifier));
    const user = byEmail
      ? await db.user.findUnique({ where: { email: identifier.toLowerCase() }, select: { securityQuestion: true, isActive: true } })
      : /^[6-9]\d{9}$/.test(phone)
        ? await db.user.findUnique({ where: { phone }, select: { securityQuestion: true, isActive: true } })
        : null;
    return json({ question: user?.isActive ? user.securityQuestion : null });
  } catch (error) { return apiError(error); }
}
