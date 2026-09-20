import { db } from "./db";
import { inr } from "./money";
import { getBusinessDetails } from "./site-content";
import type { PolicyVars } from "./policies";

// Everything a policy or the Contact page needs, gathered from store settings + business details.
export async function loadStoreContact() {
  const [store, business] = await Promise.all([
    db.store.findFirst({ include: { settings: true, shippingRules: { where: { isActive: true }, orderBy: { priority: "asc" }, take: 1 } } }).catch(() => null),
    getBusinessDetails(),
  ]);
  const settings = store?.settings;
  const rule = store?.shippingRules[0];
  const email = settings?.supportEmail ?? "";
  const phone = settings?.supportPhone ?? "";
  const gstin = settings?.gstin ?? "";
  const legalName = business.legalName || store?.name || "our store";
  const lines = [email && `Email: ${email}`, phone && `Phone: ${phone}`, business.address && `Address: ${business.address}`, gstin && `GSTIN: ${gstin}`].filter(Boolean) as string[];
  const website = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || "our website";
  const vars: PolicyVars = {
    legalName,
    website,
    returnDays: String(settings?.returnDays ?? 7),
    cancellationHours: String(settings?.cancellationHours ?? 1),
    freeShipping: inr(settings?.freeShippingThreshold ?? 49_900),
    deliveryEstimate: `${rule?.estimatedDaysMin ?? 3}–${rule?.estimatedDaysMax ?? 7} business days`,
    contactBlock: lines.length ? lines.join("\n") : "Please use the Contact page on this website.",
  };
  return { storeName: store?.name ?? "Store", legalName, email, phone, address: business.address, gstin, vars };
}
