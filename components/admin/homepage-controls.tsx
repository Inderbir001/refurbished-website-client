"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Section = { id: string; type: string; title: string; subtitle: string; position: number; isVisible: boolean };
type Banner = { id: string; title: string; subtitle: string; imageUrl: string; linkUrl: string; position: number; isVisible: boolean };
type Note = { ok: boolean; text: string } | null;

const labels: Record<string, { name: string; hint: string }> = {
  HERO: { name: "Top banner", hint: "The big panel at the top of the homepage." },
  FEATURED_PRODUCTS: { name: "Top deals", hint: "Your biggest discounts, picked automatically." },
  CATEGORIES: { name: "Offers by category", hint: "One tile per category showing its best discount." },
  COLLECTION: { name: "Collections", hint: "Rows for the collections you created." },
  BRANDS: { name: "Brand offers", hint: "Brand buttons with their best discount." },
  PROMO_BANNER: { name: "Promo banner", hint: "A wide picture banner (uses your second banner below)." },
  TRUST: { name: "Why buy from us", hint: "Warranty, returns and secure payment reassurance." },
};

export function HomepageControls({ sections: initialSections, banners: initialBanners }: { sections: Section[]; banners: Banner[] }) {
  const router = useRouter();
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [sections, setSections] = useState(initialSections);
  const [banners, setBanners] = useState(initialBanners);
  const ordered = [...sections].sort((a, b) => a.position - b.position);
  const hero = ordered.find((section) => section.type === "HERO");
  const [drafts, setDrafts] = useState<Record<string, { title: string; subtitle: string }>>(() => Object.fromEntries(sections.map((section) => [section.id, { title: section.title, subtitle: section.subtitle }])));
  const changed = (section: Section) => drafts[section.id]?.title !== section.title || drafts[section.id]?.subtitle !== section.subtitle;
  const setDraft = (id: string, patch: Partial<{ title: string; subtitle: string }>) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  async function call(url: string, method: string, body: unknown, done: string) {
    setBusy(true); setNote(null);
    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
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
  async function move(index: number, direction: -1 | 1) {
    const a = ordered[index]; const b = ordered[index + direction];
    if (!b) return;
    await update(a, { position: b.position }, "Order updated."); await update(b, { position: a.position }, "Order updated.");
  }

  return <div className="hp">
    <div className="hp-top"><p>Change how your homepage looks. Discounts fill in on their own — set those under <a href="/admin/offers">Sales &amp; coupons</a>.</p><a className="secondary-button" href="/" target="_blank" rel="noreferrer">Preview your store ↗</a></div>
    {note && <p className={note.ok ? "studio-note ok" : "studio-note bad"} role="status">{note.text}</p>}

    {hero && <section className="hp-card">
      <h2>Top banner</h2>
      <label>Headline<input value={drafts[hero.id]?.title ?? ""} placeholder="Leave empty to show “Up to 71% off” automatically" onChange={(event) => setDraft(hero.id, { title: event.target.value })} /></label>
      <label>Small text under it<input value={drafts[hero.id]?.subtitle ?? ""} onChange={(event) => setDraft(hero.id, { subtitle: event.target.value })} /></label>
      <button type="button" className="primary-button" disabled={busy || !changed(hero)} onClick={() => saveText(hero)}>{changed(hero) ? "Save banner text" : "Saved"}</button>
    </section>}

    <section className="hp-card">
      <h2>Page sections</h2>
      <p className="step-hint">Turn a section off to hide it, or move it up and down. Nothing is deleted.</p>
      <ul className="hp-list">{ordered.map((section, index) => { const label = labels[section.type] ?? { name: section.type, hint: "" };
        return <li key={section.id} className={section.isVisible ? "" : "off"}>
          <div className="hp-move"><button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${label.name} up`}>↑</button><button type="button" disabled={busy || index === ordered.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${label.name} down`}>↓</button></div>
          <div className="hp-info"><b>{label.name}</b><small>{label.hint}</small>
            {section.type !== "HERO" && <details><summary>Change the heading</summary><div className="hp-edit"><input value={drafts[section.id]?.title ?? ""} placeholder="Leave empty for the default heading" onChange={(event) => setDraft(section.id, { title: event.target.value })} aria-label={`${label.name} heading`} /><button type="button" disabled={busy || !changed(section)} onClick={() => saveText(section)}>Save</button></div></details>}
          </div>
          <button type="button" role="switch" aria-checked={section.isVisible} className={section.isVisible ? "switch on" : "switch"} disabled={busy} onClick={() => update(section, { isVisible: !section.isVisible }, section.isVisible ? `${label.name} hidden.` : `${label.name} is now showing.`)}><span /><em>{section.isVisible ? "Showing" : "Hidden"}</em></button>
        </li>; })}</ul>
    </section>

    <section className="hp-card">
      <h2>Banner pictures</h2>
      <p className="step-hint">The first showing banner is the background of the top banner; the second is the promo banner. Paste a picture link (starts with https).</p>
      {banners.length ? <ul className="hp-banners">{banners.map((banner, index) => <li key={banner.id} className={banner.isVisible ? "" : "off"}>
        <img src={banner.imageUrl} alt="" />
        <div><b>{banner.title}</b><small>{index === 0 ? "Top banner background" : index === 1 ? "Promo banner" : `Extra banner ${index + 1}`}{banner.linkUrl ? ` · opens ${banner.linkUrl}` : ""}</small></div>
        <div className="hp-actions"><button type="button" disabled={busy} onClick={async () => { if (await call("/api/admin/homepage/banners", "PATCH", { id: banner.id, isVisible: !banner.isVisible }, banner.isVisible ? "Banner hidden." : "Banner showing.")) setBanners((list) => list.map((item) => (item.id === banner.id ? { ...item, isVisible: !banner.isVisible } : item))); }}>{banner.isVisible ? "Hide" : "Show"}</button><button type="button" className="danger" disabled={busy} onClick={async () => { if (confirm(`Delete “${banner.title}”?`) && (await call("/api/admin/homepage/banners", "DELETE", { id: banner.id }, "Banner deleted."))) setBanners((list) => list.filter((item) => item.id !== banner.id)); }}>Delete</button></div>
      </li>)}</ul> : <p className="step-hint">No banners yet.</p>}
      <details className="hp-add"><summary>+ Add a banner</summary>
        <form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const added = await call("/api/admin/homepage", "POST", { title: data.get("title"), subtitle: data.get("subtitle") || undefined, imageUrl: data.get("imageUrl"), linkUrl: data.get("linkUrl") || undefined, position: banners.length, isVisible: true }, "Banner added."); if (added?.data) { const row = added.data as { id: string; title: string; subtitle?: string | null; imageUrl: string; linkUrl?: string | null; position: number; isVisible: boolean }; setBanners((list) => [...list, { id: row.id, title: row.title, subtitle: row.subtitle ?? "", imageUrl: row.imageUrl, linkUrl: row.linkUrl ?? "", position: row.position, isVisible: row.isVisible }]); form.reset(); } }}>
          <label>Title<input name="title" required /></label>
          <label>Picture link<input name="imageUrl" type="url" required placeholder="https://…" /></label>
          <label>Small text (optional)<input name="subtitle" /></label>
          <label>Opens which page (optional)<input name="linkUrl" placeholder="/products" /></label>
          <button className="primary-button" disabled={busy}>Add banner</button>
        </form>
      </details>
    </section>
  </div>;
}
