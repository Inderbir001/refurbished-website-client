import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { normalizeIndianPhone } from "@/lib/phone";
import { assertRateLimit } from "@/lib/rate-limit";
import { verifySecurityAnswer } from "@/lib/security-questions";
import { createPasswordResetToken } from "@/lib/services/password-reset";

// Compared against when there is no real answer to check, so a missing account or a missing question takes about
// as long to reject as a wrong answer does — the response time alone shouldn't tell an attacker which case it was.
const dummyHash = bcrypt.hashSync("no-account-or-no-question-set", 12);

// Step 2: a correct answer is treated the same as clicking an emailed reset link — it returns a one-time token
// for /reset-password. Heavily rate-limited (an answer is much easier to guess than a password), both per IP and
// per account, since this is effectively an authentication attempt.
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    assertRateLimit(`security-answer-ip:${ip}`, 20, 30 * 60_000);
    const { identifier, answer } = z.object({ identifier: z.string().trim().min(1), answer: z.string().trim().min(1) }).parse(await request.json());
    const byEmail = identifier.includes("@");
    const phone = byEmail ? "" : String(normalizeIndianPhone(identifier));
    const key = byEmail ? identifier.toLowerCase() : phone;
    assertRateLimit(`security-answer:${key}`, 5, 30 * 60_000);
    const user = byEmail
      ? await db.user.findUnique({ where: { email: identifier.toLowerCase() } })
      : /^[6-9]\d{9}$/.test(phone)
        ? await db.user.findUnique({ where: { phone } })
        : null;
    const usable = user?.isActive && user.securityAnswerHash;
    const correct = await verifySecurityAnswer(answer, usable ? user.securityAnswerHash! : dummyHash);
    if (!usable || !correct) throw new AppError(400, "That answer doesn't match, or no security question is set for this account.");
    const token = await createPasswordResetToken(user.id);
    await db.auditLog.create({ data: { actorId: user.id, action: "PASSWORD_RESET_VIA_SECURITY_QUESTION", entityType: "User", entityId: user.id } });
    return json({ token });
  } catch (error) { return apiError(error); }
}
