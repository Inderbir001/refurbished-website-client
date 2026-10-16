"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductPicker } from "@/components/admin/product-picker";
import { safeFetch } from "@/lib/safe-fetch";
import { ImageField, ImageListField } from "@/components/admin/image-field";

function useSubmit() { const router = useRouter(); const [message, setMessage] = useState(""); async function send(url: string, method: string, body: unknown) { const response = await safeFetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); setMessage(response.ok ? "Saved successfully." : result.error ?? "Could not save."); if (response.ok) router.refresh(); return response.ok; } return { send, message }; }
const bool = (value: FormDataEntryValue | null) => value === "on";
const paise = (value: FormDataEntryValue | null) => value ? Math.round(Number(value) * 100) : undefined;

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const singular = { categories: "category", brands: "brand", collections: "collection" } as const;

type Fields = { entity: "categories" | "brands" | "collections"; categories?: { id: string; name: string }[]; products?: { id: string; name: string }[] };
function CatalogFields({ entity, categories = [], products = [], value, ownId, formKey }: Fields & { value?: CatalogValue; ownId?: string; formKey: string }) {
  const kind = singular[entity];
  return <div className="ed-grid">
    <label>Name<input name="name" required defaultValue={value?.name} placeholder={`e.g. ${entity === "collections" ? "Best Sellers" : entity === "brands" ? "Samsung" : "Earphones"}`} /><small>Shown to customers on the store.</small></label>
    <label>Web address<input name="slug" required pattern="[a-z0-9-]+" defaultValue={value?.slug} placeholder="best-sellers" /><small>Letters, numbers and dashes only. Part of the page link.</small></label>
    <label className="wide">Description<textarea name="description" defaultValue={value?.description ?? ""} placeholder={`A short line about this ${kind}.`} /></label>
    <div className="wide"><ImageField name="imageUrl" label="Picture (optional)" defaultValue={value?.imageUrl ?? ""} /></div>
    {entity === "categories" && <>
      <label>Parent category<select name="parentId" defaultValue={value?.parentId ?? ""}><option value="">Top level</option>{categories.filter((item) => item.id !== ownId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Position in the menu<input name="position" type="number" min="0" defaultValue={value?.position ?? 0} /><small>Smaller numbers come first.</small></label>
    </>}
    {entity === "collections" && <div className="wide"><b style={{ fontSize: 13 }}>Products in this collection</b><ProductPicker key={formKey} products={products} selected={value?.productIds ?? []} /></div>}
    <label>Search title (optional)<input name="seoTitle" defaultValue={value?.seoTitle ?? ""} /><small>What Google shows as the page title.</small></label>
    <label>Search description (optional)<input name="seoDescription" defaultValue={value?.seoDescription ?? ""} /><small>The short text under the title in Google.</small></label>
  </div>;
}

export function CatalogCreateForm({ entity, categories = [], products = [] }: Fields) {
  const { send, message } = useSubmit();
  const [formKey, setFormKey] = useState(0);
  async function save(form: FormData) {
    const base = { name: form.get("name"), slug: form.get("slug"), description: form.get("description") || undefined, imageUrl: form.get("imageUrl") || undefined, seoTitle: form.get("seoTitle") || undefined, seoDescription: form.get("seoDescription") || undefined };
    const body = entity === "categories" ? { ...base, parentId: form.get("parentId") || undefined, position: Number(form.get("position")), isVisible: true } : entity === "brands" ? { ...base, logoUrl: form.get("imageUrl") || undefined, isActive: true } : { ...base, isActive: true, productIds: form.getAll("productIds") };
    return send(`/api/admin/catalog/${entity}`, "POST", body);
  }
  return <form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; if (await save(new FormData(form))) { form.reset(); setFormKey((key) => key + 1); } }} className="inline-admin-form" key={formKey}>
    <h3>Add a {singular[entity]}</h3>
    <CatalogFields entity={entity} categories={categories} products={products} formKey={String(formKey)} />
    <div className="ed-actions"><button className="primary-button">Create {singular[entity]}</button>{message && <small>{message}</small>}</div>
  </form>;
}

type CatalogValue = { id: string; name: string; slug: string; description?: string | null; imageUrl?: string | null; seoTitle?: string | null; seoDescription?: string | null; parentId?: string | null; position?: number; isVisible?: boolean; isActive?: boolean; productIds?: string[] };
export function CatalogRowEditor({ entity, value, categories = [], products = [] }: { entity: "categories" | "brands" | "collections"; value: CatalogValue; categories?: { id: string; name: string }[]; products?: { id: string; name: string }[] }) {
  const { send, message } = useSubmit();
  async function save(form: FormData) {
    const common = { id: value.id, name: form.get("name"), slug: form.get("slug"), description: form.get("description") || undefined, imageUrl: form.get("imageUrl") || undefined, seoTitle: form.get("seoTitle") || undefined, seoDescription: form.get("seoDescription") || undefined };
    const body = entity === "categories" ? { ...common, parentId: form.get("parentId") || undefined, position: Number(form.get("position")), isVisible: bool(form.get("enabled")) } : entity === "brands" ? { ...common, logoUrl: form.get("imageUrl") || undefined, isActive: bool(form.get("enabled")) } : { ...common, isActive: bool(form.get("enabled")), productIds: form.getAll("productIds") };
    await send(`/api/admin/catalog/${entity}`, "PATCH", body);
  }
  async function remove() { if (!confirm(`Delete "${value.name}"? This cannot be undone.`)) return; await send(`/api/admin/catalog/${entity}?id=${value.id}`, "DELETE", {}); }
  return <details className="row-editor"><summary>Edit</summary>
    <form onSubmit={(event) => { event.preventDefault(); void save(new FormData(event.currentTarget)); }}>
      <CatalogFields entity={entity} categories={categories} products={products} value={value} ownId={value.id} formKey={value.id} />
      <label className="ed-switch"><input name="enabled" type="checkbox" defaultChecked={entity === "categories" ? value.isVisible : value.isActive} /> Show on the store</label>
      <div className="ed-actions"><button className="primary-button">Save changes</button><button type="button" className="danger-button" onClick={remove}>Delete {singular[entity]}</button>{message && <small aria-live="polite">{message}</small>}</div>
    </form>
  </details>;
}


export function CouponCreateForm() { const { send, message } = useSubmit(); async function save(form: FormData) { await send("/api/admin/coupons", "POST", { code: form.get("code"), type: form.get("type"), value: form.get("type") === "PERCENTAGE" ? Number(form.get("value")) : paise(form.get("value")), minimumOrder: paise(form.get("minimumOrder")), maximumDiscount: paise(form.get("maximumDiscount")), usageLimit: form.get("usageLimit") ? Number(form.get("usageLimit")) : undefined, perCustomerLimit: form.get("perCustomerLimit") ? Number(form.get("perCustomerLimit")) : undefined, expiresAt: form.get("expiresAt") ? new Date(String(form.get("expiresAt"))).toISOString() : undefined, firstOrderOnly: bool(form.get("firstOrderOnly")) }); } return <form action={save} className="inline-admin-form"><h3>Create coupon</h3><div className="form-columns"><label>Code<input name="code" required /></label><label>Type<select name="type"><option>PERCENTAGE</option><option>FIXED</option></select></label><label>Value<input name="value" type="number" min="1" required /></label></div><div className="form-columns"><label>Minimum order ₹<input name="minimumOrder" type="number" /></label><label>Maximum discount ₹<input name="maximumDiscount" type="number" /></label><label>Expires<input name="expiresAt" type="datetime-local" /></label></div><div className="form-columns"><label>Total uses<input name="usageLimit" type="number" /></label><label>Per customer<input name="perCustomerLimit" type="number" /></label><label><input name="firstOrderOnly" type="checkbox" /> First order only</label></div><button className="primary-button">Create coupon</button>{message && <small>{message}</small>}</form>; }

export function ReviewActions({ id, visible }: { id: string; visible: boolean }) { const { send, message } = useSubmit(); return <div className="row-actions"><button onClick={() => send("/api/admin/reviews", "PATCH", { id, action: visible ? "HIDE" : "SHOW" })}>{visible ? "Hide" : "Approve"}</button><button onClick={() => send("/api/admin/reviews", "PATCH", { id, action: "DELETE" })}>Delete</button>{message && <small>{message}</small>}</div>; }



export function TaxRuleForm() { const { send, message } = useSubmit(); async function save(form: FormData) { await send("/api/admin/tax-rules", "POST", { name: form.get("name"), rate: Number(form.get("rate")), homeState: form.get("homeState"), isActive: true }); } return <form action={save} className="inline-admin-form"><h3>Add GST rule</h3><div className="form-columns"><label>Name<input name="name" required/></label><label>GST rate %<input name="rate" type="number" min="0" max="50" required/></label><label>Home state<input name="homeState" required/></label></div><button className="primary-button">Add tax rule</button>{message && <small>{message}</small>}</form>; }

export function UserAccessForm({ id, role, isActive }: { id: string; role: string; isActive: boolean }) { const { send, message } = useSubmit(); return <div className="row-actions"><select aria-label="Role" defaultValue={role} onChange={(event) => send("/api/admin/users", "PATCH", { id, role: event.target.value })}><option>SUPER_ADMIN</option><option>ADMIN</option><option>PRODUCT_MANAGER</option><option>ORDER_MANAGER</option><option>CUSTOMER</option></select><button onClick={() => send("/api/admin/users", "PATCH", { id, isActive: !isActive })}>{isActive ? "Deactivate" : "Activate"}</button>{message && <small>{message}</small>}</div>; }
