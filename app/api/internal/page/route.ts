import { NextRequest, NextResponse } from "next/server";
import { internalGuard } from "@/lib/internal-auth";
import { pageLoaders, runPage } from "@/lib/page-data";
import { decode, encode } from "@/lib/remote";

// One request per page for the frontend's server-rendered storefront pages (split deployment). Read-only: it can only
// run the fixed loaders listed in lib/page-data.ts, never an arbitrary query.
export async function POST(request: NextRequest) {
  const denied = internalGuard(request);
  if (denied) return denied;
  let body: { name?: string; args?: unknown };
  try { body = decode(await request.text()); } catch { return NextResponse.json({ error: { message: "Bad request" } }, { status: 400 }); }
  if (!body.name || !Object.hasOwn(pageLoaders, body.name)) return NextResponse.json({ error: { message: "Unknown page data." } }, { status: 400 });
  try {
    return new NextResponse(encode({ result: await runPage(body.name, body.args) }), { headers: { "content-type": "application/json" } });
  } catch (error) {
    console.error("page data failed", body.name, error);
    return NextResponse.json({ error: { message: "Page data could not be loaded." } }, { status: 500 });
  }
}
