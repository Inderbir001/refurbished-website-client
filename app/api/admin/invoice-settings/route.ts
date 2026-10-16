import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidGstin, isValidPan, normalizeGstin } from "@/lib/gst";
import { apiError, AppError, json } from "@/lib/http";

// Everything that appears on an invoice, saved together: the business name and address (also used on the Contact page and
// policies), the GST number and logo (store settings), and the numbering prefix / footer note / PAN (invoice settings).
const schema = z.object({
  legalName: z.string().trim().max(160),
  address: z.string().trim().max(400),
  gstin: z.string().transform(normalizeGstin).refine((value) => value === "" || isValidGstin(value), "that is not a valid GST number (15 characters, e.g. 29ABCDE1234F1Z5)"),
  pan: z.string().transform((value) => value.trim().toUpperCase()).refine((value) => value === "" || isValidPan(value), "that is not a valid PAN (like ABCDE1234F)"),
  prefix: z.string().transform((value) => value.trim().toUpperCase()).refine((value) => /^[A-Z0-9]{1,4}$/.test(value), "use 1 to 4 letters or numbers, like MM"),
  footerNote: z.string().trim().max(400),
  showLogo: z.boolean(),
  logoUrl: z.string().trim().url().or(z.literal("")),
});

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN]);
    const input = schema.parse(await request.json());
    const store = await db.store.findFirst();
    if (!store) throw new AppError(409, "Store setup is incomplete.");
    await db.$transaction(async (tx) => {
      await tx.storeSettings.upsert({ where: { storeId: store.id }, update: { gstin: input.gstin || null, logoUrl: input.logoUrl || null }, create: { storeId: store.id, gstin: input.gstin || null, logoUrl: input.logoUrl || null } });
      const business = { legalName: input.legalName, address: input.address } as Prisma.InputJsonValue;
      const invoice = { prefix: input.prefix, footerNote: input.footerNote, showLogo: input.showLogo, pan: input.pan } as Prisma.InputJsonValue;
      await tx.siteContent.upsert({ where: { key: "business" }, update: { value: business }, create: { key: "business", value: business } });
      await tx.siteContent.upsert({ where: { key: "invoice" }, update: { value: invoice }, create: { key: "invoice", value: invoice } });
      await tx.auditLog.create({ data: { actorId: admin.sub, action: "INVOICE_SETTINGS_CHANGED", entityType: "SiteContent", entityId: "invoice", after: { gstin: input.gstin || null, prefix: input.prefix } } });
    });
    return json({ saved: true });
  } catch (error) { return apiError(error); }
}
