"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string };
const paise = (value: FormDataEntryValue | null) => value ? Math.round(Number(value) * 100) : undefined;

export function CouponCreate({ products, categories, collections }: { products: Option[]; categories: Option[]; collections: Option[] }) {
  const router = useRouter();
  const [scope, setScope] = useState("ORDER");
  const [message, setMessage] = useState("");
  const options = scope === "PRODUCT" ? products : scope === "CATEGORY" ? categories : collections;
  async function save(form: FormData) {
    const response = await fetch("/api/admin/coupons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: form.get("code"), type: form.get("type"), value: form.get("type") === "PERCENTAGE" ? Number(form.get("value")) : paise(form.get("value")), minimumOrder: paise(form.get("minimumOrder")), maximumDiscount: paise(form.get("maximumDiscount")), usageLimit: form.get("usageLimit") ? Number(form.get("usageLimit")) : undefined, perCustomerLimit: form.get("perCustomerLimit") ? Number(form.get("perCustomerLimit")) : undefined, expiresAt: form.get("expiresAt") ? new Date(String(form.get("expiresAt"))).toISOString() : undefined, firstOrderOnly: form.get("firstOrderOnly") === "on", scopeType: scope, scopeIds: form.getAll("scopeIds") }) });
    const result = await response.json(); setMessage(response.ok ? "Coupon created." : result.error ?? "Coupon could not be created."); if (response.ok) router.refresh();
  }
  return <form action={save} className="inline-admin-form"><h3>Create coupon</h3><div className="form-columns"><label>Code<input name="code" required /></label><label>Type<select name="type"><option>PERCENTAGE</option><option>FIXED</option></select></label><label>Value<input name="value" type="number" min="1" required /></label></div><div className="form-columns"><label>Minimum order ₹<input name="minimumOrder" type="number" min="0" /></label><label>Maximum discount ₹<input name="maximumDiscount" type="number" min="0" /></label><label>Expires<input name="expiresAt" type="datetime-local" /></label></div><div className="form-columns"><label>Total uses<input name="usageLimit" type="number" min="1" /></label><label>Per customer<input name="perCustomerLimit" type="number" min="1" /></label><label><input name="firstOrderOnly" type="checkbox" /> First order only</label></div><label>Applies to<select value={scope} onChange={(event) => setScope(event.target.value)}><option value="ORDER">Entire order</option><option value="PRODUCT">Selected products</option><option value="CATEGORY">Selected categories</option><option value="COLLECTION">Selected collections</option></select></label>{scope !== "ORDER" && <label>Select eligible items<select name="scopeIds" multiple size={6} required>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<button className="primary-button">Create coupon</button>{message && <small>{message}</small>}</form>;
}

export function CouponActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter(); const [message, setMessage] = useState("");
  async function toggle() { const response = await fetch("/api/admin/coupons", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, isActive: !active }) }); const result = await response.json(); setMessage(response.ok ? "Updated." : result.error ?? "Update failed."); if (response.ok) router.refresh(); }
  return <div className="row-actions"><button onClick={toggle}>{active ? "Deactivate" : "Activate"}</button>{message && <small>{message}</small>}</div>;
}
