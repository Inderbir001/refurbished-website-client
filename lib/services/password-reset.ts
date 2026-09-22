import crypto from "node:crypto";
import { db } from "../db";

// Shared by both reset paths: an emailed link, and answering the security question. The raw token is only ever
// shown to whoever is holding it right now (the email, or this response) — only its hash is stored.
export async function createPasswordResetToken(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await db.passwordResetToken.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() + 60 * 60_000) } });
  return token;
}
