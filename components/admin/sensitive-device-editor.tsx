"use client";

import { useState } from "react";

type Variant = { id: string; title: string; sku: string };
type RecordValue = { variantId: string; imei?: string | null; batteryHealth?: number | null; repairHistory?: string | null; deviceCondition?: string | null; screenCondition?: string | null; bodyCondition?: string | null; accessoriesIncluded?: string | null; refurbishmentDetails?: string | null; activationStatus?: string | null };

export function SensitiveDeviceEditor({ productId, variants }: { productId: string; variants: Variant[] }) {
  const [records, setRecords] = useState<Record<string, RecordValue> | null>(null);
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch(`/api/admin/products/${productId}/sensitive`);
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Sensitive device records could not be loaded."); return; }
    setRecords(Object.fromEntries(result.data.map((item: RecordValue) => [item.variantId, item])));
    setMessage("Sensitive access was recorded in the audit log.");
  }
  async function save(form: FormData, variantId: string) {
    const number = form.get("batteryHealth");
    const body = { variantId, imei: form.get("imei"), batteryHealth: number ? Number(number) : undefined, repairHistory: form.get("repairHistory"), deviceCondition: form.get("deviceCondition"), screenCondition: form.get("screenCondition"), bodyCondition: form.get("bodyCondition"), accessoriesIncluded: form.get("accessoriesIncluded"), refurbishmentDetails: form.get("refurbishmentDetails"), activationStatus: form.get("activationStatus") };
    const response = await fetch(`/api/admin/products/${productId}/sensitive`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setMessage(response.ok ? "Encrypted device details saved and audited." : result.error ?? "Device details could not be saved.");
    if (response.ok) await load();
  }
  if (!records) return <section className="sensitive-editor"><h2>Refurbishment & device identity</h2><p>IMEI values are encrypted separately. Opening them creates an audit event.</p><button type="button" className="secondary-button" onClick={load}>Load protected device details</button>{message && <p>{message}</p>}</section>;
  return <section className="sensitive-editor"><h2>Refurbishment & device identity</h2>{variants.map((variant) => { const value = records[variant.id] ?? { variantId: variant.id }; return <details key={variant.id}><summary>{variant.title} · {variant.sku}</summary><form action={(form) => save(form, variant.id)} className="inline-admin-form"><div className="form-columns"><label>IMEI (15 digits)<input name="imei" inputMode="numeric" pattern="[0-9]{15}" defaultValue={value.imei ?? ""} /></label><label>Battery health %<input name="batteryHealth" type="number" min="0" max="100" defaultValue={value.batteryHealth ?? ""} /></label><label>Activation status<input name="activationStatus" defaultValue={value.activationStatus ?? ""} /></label></div><div className="form-columns"><label>Device condition<input name="deviceCondition" defaultValue={value.deviceCondition ?? ""} /></label><label>Screen condition<input name="screenCondition" defaultValue={value.screenCondition ?? ""} /></label><label>Body condition<input name="bodyCondition" defaultValue={value.bodyCondition ?? ""} /></label></div><label>Accessories included<textarea name="accessoriesIncluded" defaultValue={value.accessoriesIncluded ?? ""} /></label><label>Refurbishment details<textarea name="refurbishmentDetails" defaultValue={value.refurbishmentDetails ?? ""} /></label><label>Repair history<textarea name="repairHistory" defaultValue={value.repairHistory ?? ""} /></label><button className="primary-button">Save protected details</button></form></details>; })}{message && <p aria-live="polite">{message}</p>}</section>;
}
