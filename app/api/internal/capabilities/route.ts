import { NextRequest } from "next/server";
import { internalGuard } from "@/lib/internal-auth";
import { localCapabilities } from "@/lib/capabilities";
import { json } from "@/lib/http";

export async function POST(request: NextRequest) {
  return internalGuard(request) ?? json(localCapabilities());
}
