import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { indianPhone } from "@/lib/phone";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { hashSecurityAnswer } from "@/lib/security-questions";
// The security question is mandatory and can only be set or changed here, never removed — an account must always
// have one, since it's the only self-service way back in without email.
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.union([z.literal(""), indianPhone]).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(72).optional(),
  securityQuestion: z.string().trim().max(200).optional(),
  securityAnswer: z.string().trim().min(2).max(200).optional(),
}).refine((value) => !value.newPassword || Boolean(value.currentPassword), { message: "Current password is required to set a new password.", path: ["currentPassword"] })
  // Setting or changing the security question is itself a credential change (it can be used to reset the password), so it needs the current password too.
  .refine((value) => !(value.securityQuestion || value.securityAnswer) || Boolean(value.currentPassword), { message: "Current password is required to change your security question.", path: ["currentPassword"] })
  .refine((value) => !value.securityQuestion === !value.securityAnswer, { message: "Add an answer, or remove the security question.", path: ["securityAnswer"] });
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const input = schema.parse(await request.json());
    const user = await db.user.findUniqueOrThrow({ where: { id: session.sub } });
    const changesPassword = Boolean(input.currentPassword);
    if (changesPassword && !(await bcrypt.compare(input.currentPassword!, user.passwordHash))) throw new AppError(401, "Current password is incorrect.");
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        phone: input.phone || null,
        passwordHash: input.newPassword ? await bcrypt.hash(input.newPassword, 12) : undefined,
        ...(input.securityQuestion ? { securityQuestion: input.securityQuestion, securityAnswerHash: await hashSecurityAnswer(input.securityAnswer!) } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, securityQuestion: true },
    });
    return json(updated);
  } catch (error) { return apiError(error); }
}
