"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageListField } from "@/components/admin/image-field";
import { safeFetch } from "@/lib/safe-fetch";

type Option = { id: string; name: string };
const CONDITIONS: [string, string][] = [["NEW", "New"], ["REFURBISHED", "Refurbished"], ["USED", "Used"]];
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
const makeSku = () => `MM-${Date.now().toString(36).toUpperCase()}`;

// Add a product in one screen: what it is, photos, price and how many you have. Everything else can be added later.
export function NewProductForm({ storeId, categories, brands }: { storeId: string; categories: Option[]; brands: Option[] }) {
  const router = useRouter();
  const [condition, setCondition] = useState("NEW");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [sku, setSku] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(form: FormData, status: "ACTIVE" | "DRAFT") {
    setBusy(true); setError("");
    const images = String(form.get("images") || "").split("\n").map((url) => url.trim()).filter(Boolean);
    const price = Math.round(Number(form.get("basePrice")) * 100);
    const sale = String(form.get("salePrice") || "").trim();
    const name = String(form.get("name") || "").trim();
    const body = {
      storeId, name, slug: slug || slugify(name), description: String(form.get("description") || "").trim(), sku: sku || makeSku(),
      basePrice: price, salePrice: sale ? Math.round(Number(sale) * 100) : undefined, condition, grade: condition === "NEW" ? undefined : String(form.get("grade") || "") || undefined,
      categoryId: form.get("categoryId") || undefined, brandId: form.get("brandId") || undefined, warrantyMonths: Number(form.get("warrantyMonths") || 0),
      stock: Number(form.get("stock") || 0), lowStockThreshold: Number(form.get("lowStockThreshold") || 2), images, status,
    };
    const response = await safeFetch("/api/admin/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error ?? "The product could not be saved."); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    router.push(`/admin/products/${result.data.id}?created=1`);
  }
  let clicked: "ACTIVE" | "DRAFT" = "ACTIVE";

  return <form className="adm-page" style={{ padding: 0, maxWidth: "none" }} onSubmit={(event) => { event.preventDefault(); void save(new FormData(event.currentTarget), clicked); }}>
    {error && <p className="adm-banner bad" role="alert">{error}</p>}
    <section className="adm-card">
      <h2>Basic information</h2>
      <div className="adm-grid">
        <label className="adm-field full">Product name<input name="name" required minLength={3} placeholder="e.g. Apple iPhone 13 (128 GB, Blue)" onChange={(event) => { if (!slugEdited) setSlug(slugify(event.target.value)); }} /></label>
        <label className="adm-field full">Description<textarea name="description" required minLength={20} rows={4} placeholder="Storage, colour, what is in the box, condition notes…" /><small>At least 20 characters.</small></label>
        <label className="adm-field">Category<select name="categoryId" defaultValue=""><option value="">Uncategorised</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label className="adm-field">Brand<select name="brandId" defaultValue=""><option value="">Unbranded</option>{brands.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <div className="adm-field full">Condition
          <div className="adm-seg" role="radiogroup" aria-label="Condition">{CONDITIONS.map(([value, label]) => <label key={value} className={condition === value ? "on" : ""}><input type="radio" name="condition-choice" checked={condition === value} onChange={() => setCondition(value)} />{label}</label>)}</div>
        </div>
        {condition !== "NEW" && <label className="adm-field">Grade<input name="grade" list="grades" placeholder="Excellent, Good, Fair" /><datalist id="grades"><option value="Excellent" /><option value="Good" /><option value="Fair" /></datalist></label>}
        <label className="adm-field">Warranty (months)<input name="warrantyMonths" type="number" min="0" max="60" defaultValue="6" /></label>
      </div>
    </section>

    <section className="adm-card">
      <h2>Photos<small className="adm-card-sub">Upload from your computer or phone. The first photo is the main one.</small></h2>
      <ImageListField name="images" label="" />
    </section>

    <section className="adm-card">
      <h2>Price and stock<small className="adm-card-sub">Prices include GST. Stock goes down by itself when someone buys.</small></h2>
      <div className="adm-grid three">
        <label className="adm-field">Price (₹)<span className="adm-money"><span>₹</span><input name="basePrice" type="number" min="1" step="1" required /></span></label>
        <label className="adm-field">Sale price (₹)<span className="adm-money"><span>₹</span><input name="salePrice" type="number" min="1" step="1" placeholder="Optional" /></span></label>
        <label className="adm-field">Stock quantity<input name="stock" type="number" min="0" step="1" defaultValue="1" required /><small>How many you have right now.</small></label>
        <label className="adm-field">Warn me when stock is at or below<input name="lowStockThreshold" type="number" min="0" defaultValue="2" /></label>
      </div>
    </section>

    <section className="adm-card">
      <details>
        <summary>Advanced</summary>
        <div className="adm-grid">
          <label className="adm-field">Web address (slug)<input value={slug} required pattern="[a-z0-9\-]+" onChange={(event) => { setSlug(event.target.value); setSlugEdited(true); }} placeholder="filled in from the name" /><small>Letters, numbers and dashes only.</small></label>
          <label className="adm-field">Product code (SKU)<input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="Made for you if left empty" minLength={3} /></label>
        </div>
      </details>
    </section>

    <div className="adm-bar">
      <button className="adm-btn primary" disabled={busy} onClick={() => { clicked = "ACTIVE"; }}>{busy ? "Saving…" : "Publish product"}</button>
      <button className="adm-btn" disabled={busy} onClick={() => { clicked = "DRAFT"; }}>Save as draft</button>
      <span className="spacer" />
      <span className="adm-hint">You can add specifications and options (colours, storage) after publishing.</span>
    </div>
  </form>;
}
