"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string };
type Variant = { id?: string; title: string; sku: string; barcode: string; price: number | null; salePrice: number | null; stock: number; lowStockThreshold: number; weightGrams: number | null; attributes: Record<string, string> };
type ProductValue = { id: string; name: string; slug: string; description: string; sku: string; basePrice: number; salePrice: number | null; costPrice: number | null; taxRate: number; condition: string; status: string; categoryId: string | null; brandId: string | null; warrantyMonths: number; tags: string[]; grade: string | null; whatsIncluded: string | null; specifications: Record<string, string>; dimensions: Record<string, string>; seoTitle: string | null; seoDescription: string | null; variants: Variant[]; images: { url: string; alt: string | null; position: number }[] };

const rupees = (value: FormDataEntryValue | null) => value ? Math.round(Number(value) * 100) : null;
export function ProductEditor({ product, categories, brands }: { product: ProductValue; categories: Option[]; brands: Option[] }) {
  const router = useRouter();
  const [variants, setVariants] = useState(product.variants);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(form: FormData) {
    setBusy(true); setMessage("");
    try {
      const specifications = JSON.parse(String(form.get("specifications") || "{}"));
      const dimensions = JSON.parse(String(form.get("dimensions") || "{}"));
      const images = String(form.get("images") || "").split("\n").map((url) => url.trim()).filter(Boolean).map((url, position) => ({ url, alt: String(form.get("name")), position }));
      const body = { name: form.get("name"), slug: form.get("slug"), description: form.get("description"), sku: form.get("sku"), basePrice: rupees(form.get("basePrice")), salePrice: rupees(form.get("salePrice")), costPrice: rupees(form.get("costPrice")), taxRate: Number(form.get("taxRate")), condition: form.get("condition"), status: form.get("status"), categoryId: form.get("categoryId") || null, brandId: form.get("brandId") || null, warrantyMonths: Number(form.get("warrantyMonths")), tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean), grade: form.get("grade") || null, whatsIncluded: form.get("whatsIncluded") || null, specifications, dimensions, seoTitle: form.get("seoTitle") || null, seoDescription: form.get("seoDescription") || null, images, variants };
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Product could not be saved.");
      setMessage("Product, variants, images and inventory were saved."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Product could not be saved."); }
    finally { setBusy(false); }
  }
  async function duplicate() { setBusy(true); const response = await fetch(`/api/admin/products/${product.id}`, { method: "POST" }); const result = await response.json(); setBusy(false); if (response.ok) router.push(`/admin/products/${result.data.id}`); else setMessage(result.error); }
  async function archive() { if (!confirm("Archive this product? Existing orders are preserved.")) return; setBusy(true); const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" }); setBusy(false); if (response.ok) router.push("/admin/products"); else setMessage((await response.json()).error); }
  function patchVariant(index: number, field: keyof Variant, value: string | number | null | Record<string, string>) { setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)); }
  return <form action={save} className="product-form admin-editor">
    <div className="form-columns"><label>Name<input name="name" defaultValue={product.name} required /></label><label>Slug<input name="slug" defaultValue={product.slug} required /></label><label>Master SKU<input name="sku" defaultValue={product.sku} required /></label></div>
    <label>Description<textarea name="description" defaultValue={product.description} required /></label>
    <div className="form-columns"><label>Price (₹)<input name="basePrice" type="number" defaultValue={product.basePrice / 100} required /></label><label>Sale price (₹)<input name="salePrice" type="number" defaultValue={product.salePrice ? product.salePrice / 100 : ""} /></label><label>Cost price (₹)<input name="costPrice" type="number" defaultValue={product.costPrice ? product.costPrice / 100 : ""} /></label></div>
    <div className="form-columns"><label>Condition<select name="condition" defaultValue={product.condition}><option>NEW</option><option>REFURBISHED</option><option>USED</option></select></label><label>Status<select name="status" defaultValue={product.status}><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option></select></label><label>Grade<input name="grade" defaultValue={product.grade ?? ""} placeholder="Excellent / Good" /></label></div>
    <div className="form-columns"><label>Category<select name="categoryId" defaultValue={product.categoryId ?? ""}><option value="">Uncategorised</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Brand<select name="brandId" defaultValue={product.brandId ?? ""}><option value="">Unbranded</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>GST rate %<input name="taxRate" type="number" defaultValue={product.taxRate} /></label></div>
    <div className="form-columns"><label>Warranty months<input name="warrantyMonths" type="number" defaultValue={product.warrantyMonths} /></label><label>Tags<input name="tags" defaultValue={product.tags.join(", ")} /></label><label>What&apos;s included<input name="whatsIncluded" defaultValue={product.whatsIncluded ?? ""} /></label></div>
    <div className="form-columns"><label>Specifications JSON<textarea name="specifications" defaultValue={JSON.stringify(product.specifications, null, 2)} /></label><label>Dimensions JSON<textarea name="dimensions" defaultValue={JSON.stringify(product.dimensions, null, 2)} /></label><label>Image URLs, one per line<textarea name="images" defaultValue={product.images.map((image) => image.url).join("\n")} /></label></div>
    <div className="form-columns"><label>SEO title<input name="seoTitle" defaultValue={product.seoTitle ?? ""} /></label><label>SEO description<input name="seoDescription" defaultValue={product.seoDescription ?? ""} /></label></div>
    <fieldset className="variant-editor"><legend>Variants</legend>{variants.map((variant, index) => <div className="variant-row" key={variant.id ?? index}><input aria-label="Variant title" value={variant.title} onChange={(event) => patchVariant(index, "title", event.target.value)} placeholder="Title" /><input aria-label="Variant SKU" value={variant.sku} onChange={(event) => patchVariant(index, "sku", event.target.value)} placeholder="SKU" /><input aria-label="Stock" type="number" min="0" value={variant.stock} onChange={(event) => patchVariant(index, "stock", Number(event.target.value))} /><input aria-label="Low stock" type="number" min="0" value={variant.lowStockThreshold} onChange={(event) => patchVariant(index, "lowStockThreshold", Number(event.target.value))} /><input aria-label="Weight grams" type="number" value={variant.weightGrams ?? ""} onChange={(event) => patchVariant(index, "weightGrams", event.target.value ? Number(event.target.value) : null)} placeholder="grams" /><button type="button" className="secondary-button" onClick={() => setVariants((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>)}<button type="button" className="secondary-button" onClick={() => setVariants((items) => [...items, { title: "New variant", sku: `${product.sku}-${items.length + 1}`, barcode: "", price: null, salePrice: null, stock: 0, lowStockThreshold: 2, weightGrams: null, attributes: {} }])}>Add variant</button></fieldset>
    <div className="admin-actions"><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save product"}</button><button type="button" className="secondary-button" onClick={duplicate} disabled={busy}>Duplicate</button><button type="button" className="danger-button" onClick={archive} disabled={busy}>Archive</button></div>{message && <p aria-live="polite">{message}</p>}
  </form>;
}
