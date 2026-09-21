"use client";
import { useRef, useState } from "react";
type Option = { id: string; name: string };
export function NewProductForm({ storeId, categories, brands }: { storeId: string; categories: Option[]; brands: Option[] }) { const [message, setMessage] = useState(""); const formRef = useRef<HTMLFormElement>(null); async function save(form: FormData) { const value = Object.fromEntries(form); const response = await fetch("/api/admin/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...value, storeId, basePrice: Math.round(Number(value.basePrice) * 100), salePrice: value.salePrice ? Math.round(Number(value.salePrice) * 100) : undefined, stock: Number(value.stock), warrantyMonths: Number(value.warrantyMonths) }) }); const data = await response.json(); setMessage(response.ok ? `Saved ${data.data.name}. It is now live in the storefront.` : data.error ?? "Could not save product."); if (response.ok) { formRef.current?.reset(); const slug = formRef.current?.elements.namedItem("slug") as HTMLInputElement | null; if (slug) slug.dataset.edited = ""; } }
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void save(new FormData(event.currentTarget)); }} className="product-form">
    <fieldset><legend>1 · Basics</legend>
      <label>Product name<input name="name" required minLength={3} onChange={(event) => { const slug = event.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement | null; if (slug && slug.dataset.edited !== "1") slug.value = slugify(event.currentTarget.value); }} /></label>
      <label>Web address (SEO slug)<input name="slug" required pattern="[a-z0-9-]+" placeholder="apple-iphone-13-128gb" onInput={(event) => { event.currentTarget.dataset.edited = "1"; }} /><small className="hint">Filled in from the name. Letters, numbers and dashes only.</small></label>
      <label>Description<textarea name="description" required minLength={20} /><small className="hint">At least 20 characters. Mention storage, colour and what is in the box.</small></label>
      <label>SKU (your stock code)<input name="sku" required /></label>
    </fieldset>
    <fieldset><legend>2 · Price &amp; stock</legend>
      <div className="form-columns"><label>Price (₹)<input name="basePrice" type="number" min="1" required /></label><label>Sale price (₹)<input name="salePrice" type="number" min="1" /></label><label>Opening stock<input name="stock" type="number" min="0" required /></label></div>
    </fieldset>
    <fieldset><legend>3 · Details</legend>
      <div className="form-columns"><label>Condition<select name="condition"><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="USED">Used</option></select></label><label>Category<select name="categoryId"><option value="">Uncategorised</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Brand<select name="brandId"><option value="">Unbranded</option>{brands.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
      <div className="form-columns"><label>Variant name<input name="variantTitle" defaultValue="Standard" required /></label><label>Warranty (months)<input name="warrantyMonths" type="number" min="0" defaultValue="6" /></label></div>
    </fieldset>
    <fieldset><legend>4 · Photo</legend>
      <label>Photo link<input name="imageUrl" type="url" placeholder="https://…" /><small className="hint">Paste an image link, or add photos later from the product page.</small></label>
    </fieldset>
    <button className="primary-button">Publish product</button>{message && <p aria-live="polite">{message}</p>}
  </form> }
