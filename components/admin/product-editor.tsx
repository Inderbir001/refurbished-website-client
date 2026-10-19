"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageListField } from "@/components/admin/image-field";
import { fromPairs, KvEditor, toPairs, type Pair } from "@/components/admin/kv-editor";
import { safeFetch } from "@/lib/safe-fetch";

type Option = { id: string; name: string };
type Variant = { id?: string; title: string; sku: string; barcode: string; price: number | null; salePrice: number | null; stock: number; lowStockThreshold: number; weightGrams: number | null; attributes: Record<string, string> };
type ProductValue = { id: string; name: string; slug: string; description: string; sku: string; basePrice: number; salePrice: number | null; costPrice: number | null; taxRate: number; condition: string; status: string; categoryId: string | null; brandId: string | null; warrantyMonths: number; tags: string[]; grade: string | null; whatsIncluded: string | null; specifications: Record<string, string>; dimensions: Record<string, string>; seoTitle: string | null; seoDescription: string | null; variants: Variant[]; images: { url: string; alt: string | null; position: number }[] };

const toPaise = (value: FormDataEntryValue | null) => (value && String(value).trim() !== "" ? Math.round(Number(value) * 100) : null);
const CONDITIONS: [string, string][] = [["NEW", "New"], ["REFURBISHED", "Refurbished"], ["USED", "Used"]];

// One page for everything about a product, in plain steps: basics, photos, price, stock, details, advanced.
export function ProductEditor({ product, categories, brands, created = false }: { product: ProductValue; categories: Option[]; brands: Option[]; created?: boolean }) {
  const router = useRouter();
  const [variants, setVariants] = useState(product.variants);
  const [options, setOptions] = useState(product.variants.length > 1);
  const [condition, setCondition] = useState(product.condition);
  const [live, setLive] = useState(product.status === "ACTIVE");
  const [specs, setSpecs] = useState<Pair[]>(toPairs(product.specifications));
  const [dims, setDims] = useState<Pair[]>(toPairs(product.dimensions));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(created ? { ok: true, text: "Product published. Add more details below if you like." } : null);
  const [busy, setBusy] = useState(false);

  async function save(form: FormData) {
    setBusy(true); setMessage(null);
    try {
      const images = String(form.get("images") || "").split("\n").map((url) => url.trim()).filter(Boolean).map((url, position) => ({ url, alt: String(form.get("name")), position }));
      const body = {
        name: form.get("name"), slug: form.get("slug"), description: form.get("description"), sku: form.get("sku"),
        basePrice: toPaise(form.get("basePrice")), salePrice: toPaise(form.get("salePrice")), costPrice: toPaise(form.get("costPrice")), taxRate: Number(form.get("taxRate")),
        condition, status: live ? "ACTIVE" : product.status === "ARCHIVED" ? "ARCHIVED" : "DRAFT",
        categoryId: form.get("categoryId") || null, brandId: form.get("brandId") || null, warrantyMonths: Number(form.get("warrantyMonths") || 0),
        tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean), grade: condition === "NEW" ? null : form.get("grade") || null,
        whatsIncluded: form.get("whatsIncluded") || null, specifications: fromPairs(specs), dimensions: fromPairs(dims),
        seoTitle: form.get("seoTitle") || null, seoDescription: form.get("seoDescription") || null, images, variants,
      };
      const response = await safeFetch(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The product could not be saved.");
      setMessage({ ok: true, text: "Saved. Your changes are live." }); router.refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "The product could not be saved." }); }
    finally { setBusy(false); }
  }
  async function duplicate() {
    setBusy(true);
    const response = await safeFetch(`/api/admin/products/${product.id}`, { method: "POST" });
    const result = await response.json(); setBusy(false);
    if (response.ok) router.push(`/admin/products/${result.data.id}`); else setMessage({ ok: false, text: result.error ?? "It could not be duplicated." });
  }
  async function archive() {
    if (!confirm("Remove this product from the shop? Orders already placed are kept.")) return;
    setBusy(true);
    const response = await safeFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    setBusy(false);
    if (response.ok) router.push("/admin/products"); else setMessage({ ok: false, text: (await response.json()).error ?? "It could not be removed." });
  }
  const patchVariant = (index: number, patch: Partial<Variant>) => setVariants((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const single = variants[0];
  const rupeeText = (paise: number | null) => (paise == null ? "" : String(paise / 100));

  return <form onSubmit={(event) => { event.preventDefault(); void save(new FormData(event.currentTarget)); }} className="adm-page" style={{ padding: 0, maxWidth: "none" }}>
    <section className="adm-card">
      <h2>Basic information</h2>
      <div className="adm-grid">
        <label className="adm-field full">Product name<input name="name" defaultValue={product.name} required minLength={3} /></label>
        <label className="adm-field full">Description<textarea name="description" defaultValue={product.description} required minLength={20} rows={5} /><small>What it is, key features, and what shoppers should know. At least 20 characters.</small></label>
        <label className="adm-field">Category<select name="categoryId" defaultValue={product.categoryId ?? ""}><option value="">Uncategorised</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="adm-field">Brand<select name="brandId" defaultValue={product.brandId ?? ""}><option value="">Unbranded</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="adm-field full">Condition
          <div className="adm-seg" role="radiogroup" aria-label="Condition">{CONDITIONS.map(([value, label]) => <label key={value} className={condition === value ? "on" : ""}><input type="radio" name="condition-choice" checked={condition === value} onChange={() => setCondition(value)} />{label}</label>)}</div>
        </div>
        {condition !== "NEW" && <label className="adm-field">Grade<input name="grade" list="grades" defaultValue={product.grade ?? ""} placeholder="Excellent, Good, Fair" /><datalist id="grades"><option value="Excellent" /><option value="Good" /><option value="Fair" /></datalist><small>How good the item looks. Shown to shoppers.</small></label>}
        <label className="adm-switch full"><input type="checkbox" checked={live} onChange={(event) => setLive(event.target.checked)} /><i /><span>Show in the shop<small>{live ? "Shoppers can see and buy this product." : "Hidden from shoppers (saved as a draft)."}</small></span></label>
      </div>
    </section>

    <section className="adm-card">
      <h2>Photos<small className="adm-card-sub">The first photo is the main one. Upload from your computer or phone.</small></h2>
      <ImageListField name="images" label="" alt={product.name} defaultValue={product.images.map((image) => image.url)} />
    </section>

    <section className="adm-card">
      <h2>Price<small className="adm-card-sub">Prices include GST. Customers pay exactly this amount.</small></h2>
      <div className="adm-grid three">
        <label className="adm-field">Price (₹)<span className="adm-money"><span>₹</span><input name="basePrice" type="number" min="1" step="1" defaultValue={product.basePrice / 100} required /></span></label>
        <label className="adm-field">Sale price (₹)<span className="adm-money"><span>₹</span><input name="salePrice" type="number" min="1" step="1" defaultValue={rupeeText(product.salePrice)} placeholder="Optional" /></span><small>If set, shoppers see this price with the original struck through.</small></label>
        <label className="adm-field">GST rate (%)<input name="taxRate" type="number" min="0" max="50" defaultValue={product.taxRate} /></label>
      </div>
    </section>

    <section className="adm-card">
      <h2>Stock<small className="adm-card-sub">How many you have. It goes down by itself when someone buys.</small></h2>
      {!options && single
        ? <>
          <div className="adm-grid">
            <label className="adm-field">Stock quantity<input type="number" min="0" value={single.stock} onChange={(event) => patchVariant(0, { stock: Math.max(0, Number(event.target.value) || 0) })} /></label>
            <label className="adm-field">Warn me when stock is at or below<input type="number" min="0" value={single.lowStockThreshold} onChange={(event) => patchVariant(0, { lowStockThreshold: Math.max(0, Number(event.target.value) || 0) })} /><small>It shows as “low stock” on the Stock page.</small></label>
          </div>
          <div><button type="button" className="adm-link" onClick={() => setOptions(true)}>This product comes in options (colour, storage…) →</button></div>
        </>
        : <>
          <div className="adm-variants">{variants.map((variant, index) => <div className="adm-variant" key={variant.id ?? index}>
            <label className="adm-field">Option name<input value={variant.title} onChange={(event) => patchVariant(index, { title: event.target.value })} placeholder="e.g. Black, 128 GB" /></label>
            <label className="adm-field">SKU<input value={variant.sku} onChange={(event) => patchVariant(index, { sku: event.target.value })} /></label>
            <label className="adm-field">Stock<input type="number" min="0" value={variant.stock} onChange={(event) => patchVariant(index, { stock: Math.max(0, Number(event.target.value) || 0) })} /></label>
            <label className="adm-field">Price (₹)<input type="number" min="0" value={rupeeText(variant.price)} placeholder="Same" onChange={(event) => patchVariant(index, { price: event.target.value ? Math.round(Number(event.target.value) * 100) : null })} /></label>
            <label className="adm-field">Low alert<input type="number" min="0" value={variant.lowStockThreshold} onChange={(event) => patchVariant(index, { lowStockThreshold: Math.max(0, Number(event.target.value) || 0) })} /></label>
            <button type="button" className="adm-link danger" disabled={variants.length === 1} onClick={() => setVariants((items) => items.filter((_, i) => i !== index))}>Remove</button>
          </div>)}</div>
          <div><button type="button" className="adm-btn small ghost" onClick={() => setVariants((items) => [...items, { title: "", sku: `${product.sku}-${items.length + 1}`, barcode: "", price: null, salePrice: null, stock: 0, lowStockThreshold: 2, weightGrams: null, attributes: {} }])}>+ Add an option</button></div>
          <p className="adm-hint">Each option has its own stock. Leave “Price” empty to use the product price.</p>
        </>}
    </section>

    <section className="adm-card">
      <h2>Details for shoppers</h2>
      <div className="adm-grid">
        <label className="adm-field">Warranty (months)<input name="warrantyMonths" type="number" min="0" max="60" defaultValue={product.warrantyMonths} /></label>
        <label className="adm-field">What&apos;s in the box<input name="whatsIncluded" defaultValue={product.whatsIncluded ?? ""} placeholder="Phone, charger, cable" /></label>
        <div className="adm-field full">Specifications
          <KvEditor pairs={specs} onChange={setSpecs} keyPlaceholder="Name (e.g. Display)" valuePlaceholder="Value (e.g. 6.1 inch OLED)" addLabel="Add a specification" />
        </div>
        <label className="adm-field full">Search keywords<input name="tags" defaultValue={product.tags.join(", ")} placeholder="iphone, apple, 128gb" /><small>Separate with commas. Helps shoppers find it in search.</small></label>
      </div>
    </section>

    <section className="adm-card">
      <details>
        <summary>Advanced</summary>
        <div className="adm-grid">
          <label className="adm-field">Web address (slug)<input name="slug" defaultValue={product.slug} required pattern="[a-z0-9\-]+" /><small>Letters, numbers and dashes only. Changing it changes the product link.</small></label>
          <label className="adm-field">Product code (SKU)<input name="sku" defaultValue={product.sku} required minLength={3} /></label>
          <label className="adm-field">Your cost price (₹)<span className="adm-money"><span>₹</span><input name="costPrice" type="number" min="0" defaultValue={rupeeText(product.costPrice)} placeholder="Private, never shown" /></span></label>
          <span />
          <label className="adm-field">Page title for Google<input name="seoTitle" defaultValue={product.seoTitle ?? ""} placeholder="Leave empty to use the product name" /></label>
          <label className="adm-field">Page description for Google<input name="seoDescription" defaultValue={product.seoDescription ?? ""} placeholder="One or two sentences" /></label>
          <div className="adm-field full">Size & weight
            <KvEditor pairs={dims} onChange={setDims} keyPlaceholder="Name (e.g. Height)" valuePlaceholder="Value (e.g. 147 mm)" addLabel="Add a measurement" />
          </div>
        </div>
      </details>
    </section>

    <div className="adm-bar">
      <button className="adm-btn primary" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
      <button type="button" className="adm-btn" onClick={duplicate} disabled={busy}>Duplicate</button>
      <span className="spacer" />
      {message && <span className={`msg ${message.ok ? "ok" : "bad"}`} role="status">{message.text}</span>}
      <button type="button" className="adm-btn danger" onClick={archive} disabled={busy}>Remove from shop</button>
    </div>
  </form>;
}
