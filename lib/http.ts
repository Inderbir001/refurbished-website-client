import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error { constructor(public status: number, message: string) { super(message); } }
export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = String(issue?.path.at(-1) ?? "");
    const label = ({ line1: "address", line2: "address line 2", pincode: "pincode", idempotencyKey: "checkout session", currentPassword: "current password", newPassword: "new password", securityQuestion: "security question", securityAnswer: "security answer" } as Record<string, string>)[field] ?? field;
    const message = issue && label ? `Please check the ${label}: ${issue.message.toLowerCase()}.` : "Invalid request";
    return NextResponse.json({ error: message, fields: error.flatten() }, { status: 400 });
  }
  if (error instanceof AppError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
export const json = <T>(data: T, status = 200) => NextResponse.json({ data }, { status });
