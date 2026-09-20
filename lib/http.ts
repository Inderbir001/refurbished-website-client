import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error { constructor(public status: number, message: string) { super(message); } }
export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request", fields: error.flatten() }, { status: 400 });
  if (error instanceof AppError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
export const json = <T>(data: T, status = 200) => NextResponse.json({ data }, { status });
