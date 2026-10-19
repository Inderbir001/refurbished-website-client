"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/lib/safe-fetch";
import { ImageField } from "@/components/admin/image-field";
import { BannerStudio, type NewSlide, type StudioCategory, type StudioProduct } from "@/components/admin/banner-studio";

type Section = { id: string; type: string; title: string; subtitle: string; position: number; isVisible: boolean };
type Banner = { id: string; title: string; subtitle: string; imageUrl: string; mobileImageUrl: string; linkUrl: string; position: number; isVisible: boolean };
type Note = { ok: boolean; text: string } | null;

const labels: Record<string, { name: string; hint: string }> = {
  HERO: { name: "Slideshow and highlights", hint: "The offers slideshow at the very top, with the delivery, returns and warranty strip under it." },
  FEATURED_PRODUCTS: { name: "Best sellers and deals", hint: "Best sellers (or top picks), coupons, mega deals, refurbished and the newest products." },
  CATEGORIES: { name: "Categories", hint: "Round buttons for each category, right under the best sellers." },
  COLLECTION: { name: "Collections", hint: "Rows for the collections you created." },
  BRANDS: { name: "Brands and budget", hint: "Shop-by-brand buttons and budget shortcuts." },
  PROMO_BANNER: { name: "Promo banner", hint: "Not used any more. Offers now live in the slideshow." },
  TRUST: { name: "Why buy from us", hint: "Reassurance, quick answers and your contact details." },
};
// The homepage shows its parts in this order. You can switch parts on or off, but not reorder them.
const rank: Record<string, number> = { HERO: 0, FEATURED_PRODUCTS: 1, CATEGORIES: 2, COLLECTION: 3, BRANDS: 4, TRUST: 5 };

export function HomepageControls({ sections: initialSections, banners, products, categories }: { sections: Section[]; banners: Banner[]; products: StudioProduct[]; categories: StudioCategory[] }) {
  const router = useRouter();
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [sections, setSections] = useState(initialSections);
  const [mode, setMode] = useState<"none" | "make" | "upload">("none");
  const ordered = [...sections].filter((section) => section.type !== "PROMO_BANNER").sort((a, b) => (rank[a.type] ?? 9) - (rank[b.type] ?? 9));
  const [drafts, setDrafts] = useState<Record<string, { title: string; subtitle: string }>>(() => Object.fromEntries(sections.map((section) => [section.id, { title: section.title, subtitle: section.subtitle }])));
  const changed = (section: Section) => drafts[section.id]?.title !== section.title || drafts[section.id]?.subtitle !== section.subtitle;
  const setDraft = (id: string, patch: Partial<{ title: string; subtitle: string }>) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  async function call(url: string, method: string, body: unknown, done: string) {
    setBusy(true); setNote(null);
    const response = await safeFetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setBusy(false);
    setNote({ ok: response.ok, text: response.ok ? done : result.error ?? "Something went wrong." });
    if (response.ok) router.refresh();
    return response.ok ? (result as { data?: unknown }) : null;
  }
  async function update(section: Section, patch: Partial<Section>, done: string) {
    const ok = await call("/api/admin/homepage", "PATCH", { ...section, ...patch }, done);
    if (ok) setSections((list) => list.map((item) => (item.id === section.id ? { ...item, ...patch } : item)));
    return ok;
  }
  const saveText = (section: Section) => update(section, { title: drafts[section.id].title, subtitle: drafts[section.id].subtitle }, `${labels[section.type]?.name ?? "Section"} saved.`);
  async function reorder(index: number, direction: -1 | 1) {
    const a = banners[index]; const b = banners[index + direction];
    if (!b) return;
    await call("/api/admin/homepage/banners", "PATCH", { id: a.id, position: b.position === a.position ? b.position + direction : b.position }, "Order updated.");
    await call("/api/admin/homepage/banners", "PATCH", { id: b.id, position: a.position }, "Order updated.");
  }

  return <div className="hp">
    <div className="hp-top"><p>Change how your homepage looks. Discounts fill in on their own — set those under <a href="/admin/offers">Sales &amp; coupons</a>.</p><a className="secondary-button" href="/" target="_blank" rel="noreferrer">Preview your store ↗</a></div>
    {note && <p className={note.ok ? "studio-note ok" : "studio-note bad"} role="status">{note.text}</p>}

    <section className="hp-card">
      <h2>Page sections</h2>
      <p className="step-hint">Turn a part of the page off to hide it. The order is fixed: slideshow, best sellers, categories, then the rest. Nothing is deleted.</p>
      <ul className="hp-list">{ordered.map((section, index) => { const label = labels[section.type] ?? { name: section.type, hint: "" };
        return <li key={section.id} className={section.isVisible ? "" : "off"}>
          <div className="hp-info"><b>{label.name}</b><small>{label.hint}</small>
            {section.type !== "HERO" && section.type !== "TRUST" && section.type !== "COLLECTION" && <details><summary>Change the heading</summary><div className="hp-edit"><input value={drafts[section.id]?.title ?? ""} placeholder="Leave empty to keep the standard heading" onChange={(event) => setDraft(section.id, { title: event.target.value })} aria-label={`${label.name} heading`} /><button type="button" disabled={busy || !changed(section)} onClick={() => saveText(section)}>Save</button></div></details>}
          </div>
          <button type="button" role="switch" aria-checked={section.isVisible} className={section.isVisible ? "switch on" : "switch"} disabled={busy} onClick={() => update(section, { isVisible: !section.isVisible }, section.isVisible ? `${label.name} hidden.` : `${label.name} is now showing.`)}><span /><em>{section.isVisible ? "Showing" : "Hidden"}</em></button>
        </li>; })}</ul>
    </section>

    <section className="hp-card">
      <h2>Offers slideshow</h2>
      <p className="step-hint">These pictures slide across the top of your homepage and open the page you choose. Make one in a minute, or upload a poster you designed (best size 1800 × 630).</p>
      {banners.length ? <ul className="hp-banners">{banners.map((banner, index) => <li key={banner.id} className={banner.isVisible ? "" : "off"}>
        <img src={banner.imageUrl} alt="" />
        <div><b>{banner.title}</b><small>Slide {index + 1}{banner.mobileImageUrl ? " · has a phone version" : ""}{banner.linkUrl ? ` · opens ${banner.linkUrl}` : ""}{banner.isVisible ? "" : " · hidden"}</small></div>
        <div className="hp-actions">
          <button type="button" disabled={busy || index === 0} aria-label="Move earlier" onClick={() => reorder(index, -1)}>←</button>
          <button type="button" disabled={busy || index === banners.length - 1} aria-label="Move later" onClick={() => reorder(index, 1)}>→</button>
          <button type="button" disabled={busy} onClick={() => call("/api/admin/homepage/banners", "PATCH", { id: banner.id, isVisible: !banner.isVisible }, banner.isVisible ? "Slide hidden." : "Slide showing.")}>{banner.isVisible ? "Hide" : "Show"}</button>
          <button type="button" className="danger" disabled={busy} onClick={() => { if (confirm(`Delete “${banner.title}”?`)) void call("/api/admin/homepage/banners", "DELETE", { id: banner.id }, "Slide deleted."); }}>Delete</button>
        </div>
      </li>)}</ul> : <p className="step-hint">No slides yet. Your homepage shows a simple welcome banner until you add one.</p>}
      <div className="hp-add-row">
        <button type="button" className={mode === "make" ? "primary-button" : "secondary-button"} onClick={() => setMode(mode === "make" ? "none" : "make")}>✨ Create a banner</button>
        <button type="button" className={mode === "upload" ? "primary-button" : "secondary-button"} onClick={() => setMode(mode === "upload" ? "none" : "upload")}>Upload my own picture</button>
      </div>
      {mode === "make" && <BannerStudio products={products} categories={categories} busy={busy} onCreate={async (slide: NewSlide) => { const added = await call("/api/admin/homepage", "POST", { title: slide.title, imageUrl: slide.imageUrl, mobileImageUrl: slide.mobileImageUrl, linkUrl: slide.linkUrl, position: banners.length, isVisible: true }, "Added to the slideshow."); if (added) setMode("none"); return Boolean(added); }} />}
      {mode === "upload" && <form className="hp-upload" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const added = await call("/api/admin/homepage", "POST", { title: data.get("title"), imageUrl: data.get("imageUrl"), mobileImageUrl: data.get("mobileImageUrl") || undefined, linkUrl: data.get("linkUrl") || undefined, position: banners.length, isVisible: true }, "Added to the slideshow."); if (added) { form.reset(); setMode("none"); } }}>
        <label>Name (only you see this)<input name="title" required minLength={2} placeholder="Diwali sale" /></label>
        <ImageField name="imageUrl" label="Picture for computers" required hint="Wide poster, best at 1800 × 630 pixels. Put your text inside the picture." />
        <ImageField name="mobileImageUrl" label="Picture for phones (optional)" hint="Best at 900 × 750 pixels. If you skip it, the computer picture is used." />
        <label>Opens which page (optional)<input name="linkUrl" placeholder="/products" /></label>
        <button className="primary-button" disabled={busy}>Add to the slideshow</button>
      </form>}
    </section>
  </div>;
}
