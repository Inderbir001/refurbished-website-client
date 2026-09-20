"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Section = { id: string; type: string; title: string; subtitle: string; position: number; isVisible: boolean };
type Banner = { id: string; title: string; subtitle: string; imageUrl: string; linkUrl: string; position: number; isVisible: boolean };

const labels: Record<string, { name: string; hint: string }> = {
  HERO: { name: "Hero banner", hint: "Big panel at the top. Headline blank = automatic “Up to X% off”." },
  FEATURED_PRODUCTS: { name: "Top deals", hint: "The biggest discounts, picked automatically. Title only." },
  CATEGORIES: { name: "Offers by category", hint: "One tile per category with its best discount." },
  COLLECTION: { name: "Collections", hint: "Rows for your collections (edit them under Collections)." },
  BRANDS: { name: "Brand offers", hint: "Brand chips with their best discount." },
  PROMO_BANNER: { name: "Promo banner", hint: "Uses your second banner below." },
  TRUST: { name: "Trust strip", hint: "Warranty, returns and payment reassurance." },
};

export function HomepageControls({ sections, banners }: { sections: Section[]; banners: Banner[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const ordered = [...sections].sort((a, b) => a.position - b.position);

  async function call(url: string, method: string, body: unknown, done: string) {
    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setMessage(response.ok ? done : result.error ?? "Something went wrong.");
    if (response.ok) router.refresh();
    return response.ok;
  }
  const update = (section: Section, patch: Partial<Section>, done = "Homepage updated.") => call("/api/admin/homepage", "PATCH", { ...section, ...patch }, done);
  // Swap with the neighbour so positions never tie.
  async function move(index: number, direction: -1 | 1) {
    const a = ordered[index]; const b = ordered[index + direction];
    if (!b) return;
    await update(a, { position: b.position }, "Order updated."); await update(b, { position: a.position }, "Order updated.");
  }
  async function addBanner(form: FormData) {
    return call("/api/admin/homepage", "POST", { title: form.get("title"), subtitle: form.get("subtitle") || undefined, imageUrl: form.get("imageUrl"), linkUrl: form.get("linkUrl") || undefined, position: banners.length, isVisible: true }, "Banner created.");
  }

  return <div className="storefront-admin">
    <h2>Homepage sections</h2>
    <p className="sf-hint">Reorder or hide sections. Deals inside them fill in automatically from your product discounts — manage those under <a href="/admin/offers">Offers &amp; deals</a>.</p>
    <div className="sf-sections">{ordered.map((section, index) => { const label = labels[section.type] ?? { name: section.type, hint: "" };
      return <div key={section.id} className={section.isVisible ? "sf-row" : "sf-row off"}>
        <div className="sf-order"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">↑</button><button type="button" disabled={index === ordered.length - 1} onClick={() => move(index, 1)} aria-label="Move down">↓</button></div>
        <div className="sf-main"><b>{label.name}</b><small>{label.hint}</small>
          <div className="sf-fields">
            <label>{section.type === "HERO" ? "Headline" : "Heading"}<input defaultValue={section.title} placeholder={section.type === "HERO" ? "Leave blank for “Up to X% off”" : "Leave blank for the default"} onBlur={(event) => { if (event.target.value !== section.title) void update(section, { title: event.target.value }); }} /></label>
            {section.type === "HERO" && <label>Sub-text<input defaultValue={section.subtitle} onBlur={(event) => { if (event.target.value !== section.subtitle) void update(section, { subtitle: event.target.value }); }} /></label>}
          </div>
        </div>
        <button type="button" className={section.isVisible ? "sf-toggle on" : "sf-toggle"} onClick={() => update(section, { isVisible: !section.isVisible }, section.isVisible ? "Section hidden." : "Section shown.")}>{section.isVisible ? "Visible" : "Hidden"}</button>
      </div>; })}</div>

    <h2>Banners</h2>
    <p className="sf-hint">The first visible banner is the hero background; the second is the promo banner. Use a full https image link (Media library → copy URL).</p>
    {banners.length ? <div className="sf-banners">{banners.map((banner, index) => <div key={banner.id} className={banner.isVisible ? "sf-banner" : "sf-banner off"}>
      <img src={banner.imageUrl} alt="" />
      <div><b>{banner.title}</b><small>{banner.subtitle || "No subtitle"}{banner.linkUrl ? ` · links to ${banner.linkUrl}` : ""}</small><small>Position {index + 1}{index === 0 ? " · hero background" : index === 1 ? " · promo banner" : ""}</small></div>
      <div className="sf-banner-actions">
        <button type="button" onClick={() => call("/api/admin/homepage/banners", "PATCH", { id: banner.id, isVisible: !banner.isVisible }, banner.isVisible ? "Banner hidden." : "Banner shown.")}>{banner.isVisible ? "Hide" : "Show"}</button>
        <button type="button" className="danger-button" onClick={() => { if (confirm(`Delete banner “${banner.title}”?`)) void call("/api/admin/homepage/banners", "DELETE", { id: banner.id }, "Banner deleted."); }}>Delete</button>
      </div>
    </div>)}</div> : <p className="sf-hint">No banners yet.</p>}

    <form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; if (await addBanner(new FormData(form))) form.reset(); }} className="inline-admin-form"><h3>Add a banner</h3><div className="form-columns"><label>Title<input name="title" required /></label><label>Subtitle<input name="subtitle" /></label><label>Image URL<input name="imageUrl" type="url" required /></label></div><label>Link path<input name="linkUrl" placeholder="/products" /></label><button className="primary-button">Create banner</button></form>
    {message && <p className="sf-msg" role="status">{message}</p>}
  </div>;
}
