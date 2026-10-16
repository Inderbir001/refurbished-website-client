import { db } from "./db";

export type Announcement = { enabled: boolean; messages: string[] };
export type BusinessDetails = { legalName: string; address: string };
export type InvoiceSettings = { prefix: string; footerNote: string; showLogo: boolean; pan: string };

export const defaultAnnouncement: Announcement = {
  enabled: true,
  messages: ["Free delivery over ₹499", "6-month warranty on certified refurbished", "7-day easy returns", "Secure payments by Razorpay", "Tested and graded before it ships"],
};

// Reads never throw: if the table is missing or the database hiccups, the storefront falls back to defaults.
export async function readContent<T>(key: string): Promise<{ value: T; updatedAt: Date } | null> {
  try {
    const row = await db.siteContent.findUnique({ where: { key } });
    return row ? { value: row.value as T, updatedAt: row.updatedAt } : null;
  } catch { return null; }
}

export async function getAnnouncement(): Promise<Announcement> {
  const row = await readContent<Partial<Announcement>>("announcement");
  const messages = Array.isArray(row?.value.messages) ? row.value.messages.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  return { enabled: row?.value.enabled ?? true, messages: messages.length ? messages : defaultAnnouncement.messages };
}

export async function getBusinessDetails(): Promise<BusinessDetails> {
  const row = await readContent<Partial<BusinessDetails>>("business");
  return { legalName: row?.value.legalName?.trim() ?? "", address: row?.value.address?.trim() ?? "" };
}

// What shows on invoices besides the business details: number prefix, footer note, logo, PAN.
export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const row = await readContent<Partial<InvoiceSettings>>("invoice");
  const prefix = (row?.value.prefix ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return { prefix: prefix || "MM", footerNote: row?.value.footerNote?.trim() ?? "", showLogo: row?.value.showLogo ?? true, pan: row?.value.pan?.trim() ?? "" };
}
