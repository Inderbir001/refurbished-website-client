import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";
import { POLICIES } from "@/lib/policies";

const roles = [Role.SUPER_ADMIN, Role.ADMIN];
const policyKeys = POLICIES.map((policy) => `policy:${policy.slug}`);
const keySchema = z.string().refine((key) => key === "announcement" || key === "business" || policyKeys.includes(key), "Unknown content key.");
const schemas = {
  announcement: z.object({ enabled: z.boolean(), messages: z.array(z.string().trim().min(1, "A message cannot be empty.").max(140, "Keep each message under 140 characters.")).min(1, "Add at least one message.").max(10, "Up to 10 messages.") }),
  business: z.object({ legalName: z.string().trim().max(160), address: z.string().trim().max(400) }),
  policy: z.object({ body: z.string().trim().min(20, "The text is too short.").max(30_000, "The text is too long.") }),
};

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request, roles);
    const { key, value } = z.object({ key: keySchema, value: z.unknown() }).parse(await request.json());
    const schema = key === "announcement" ? schemas.announcement : key === "business" ? schemas.business : schemas.policy;
    const clean = schema.parse(value);
    const row = await db.siteContent.upsert({ where: { key }, update: { value: clean as Prisma.InputJsonValue }, create: { key, value: clean as Prisma.InputJsonValue } });
    await db.auditLog.create({ data: { actorId: admin.sub, action: "SITE_CONTENT_UPDATED", entityType: "SiteContent", entityId: key } });
    return json({ key, updatedAt: row.updatedAt });
  } catch (error) { return apiError(error); }
}

// Reset one item back to its built-in default.
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request, roles);
    const { key } = z.object({ key: keySchema }).parse(await request.json());
    await db.siteContent.deleteMany({ where: { key } });
    await db.auditLog.create({ data: { actorId: admin.sub, action: "SITE_CONTENT_RESET", entityType: "SiteContent", entityId: key } });
    return json({ reset: true });
  } catch (error) { return apiError(error); }
}
