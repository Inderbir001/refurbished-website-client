import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { internalGuard } from "@/lib/internal-auth";
import { decode, encode } from "@/lib/remote";

// Read-only data access for the frontend's server-rendered pages (split deployment).
// Writes are impossible here by design: they only happen inside the normal /api routes on this backend.
const READS = new Set(["findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy"]);
const NEVER_SERVED = new Set(["passwordResetToken"]);
const MODELS = new Set(Object.values(Prisma.ModelName).map((name) => name.charAt(0).toLowerCase() + name.slice(1)).filter((name) => !NEVER_SERVED.has(name)));
// The frontend has no use for these, so they never leave the backend even if a page selects the whole row.
const SECRET_FIELDS = new Set(["passwordHash", "imeiEncrypted", "tokenHash", "securityAnswerHash"]);
function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object" && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).filter(([key]) => !SECRET_FIELDS.has(key)).map(([key, item]) => [key, scrub(item)]));
  return value;
}

export async function POST(request: NextRequest) {
  const denied = internalGuard(request);
  if (denied) return denied;
  let body: { model?: string; action?: string; args?: unknown };
  try { body = decode(await request.text()); } catch { return NextResponse.json({ error: { message: "Bad request" } }, { status: 400 }); }
  if (!body.model || !body.action || !MODELS.has(body.model) || !READS.has(body.action)) return NextResponse.json({ error: { message: "Operation not allowed." } }, { status: 400 });
  try {
    const delegate = (db as unknown as Record<string, Record<string, (args: unknown) => Promise<unknown>>>)[body.model];
    const result = await delegate[body.action](body.args ?? {});
    return new NextResponse(encode({ result: scrub(result) }), { headers: { "content-type": "application/json" } });
  } catch (error) {
    const err = error as { name?: string; code?: string; message?: string };
    console.error("internal db request failed", body.model, body.action, err.code ?? err.name);
    const message = (err.message ?? "Database request failed.").split("\n").filter(Boolean).pop() ?? "Database request failed.";
    return NextResponse.json({ error: { name: err.name, code: err.code, message } }, { status: 400 });
  }
}
