"use client";
import { useState } from "react";
import { TOKEN_HELP } from "@/lib/policies";

type Note = { ok: boolean; text: string } | null;
type Item = { slug: string; title: string; summary: string; defaultBody: string; body: string; customised: boolean };

export function PolicyEditor({ business, items, canEdit }: { business: { legalName: string; address: string }; items: Item[]; canEdit: boolean }) {
  const [biz, setBiz] = useState(business);
  const [bizSaved, setBizSaved] = useState(business);
  const [list, setList] = useState(items);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(items.map((item) => [item.slug, item.body])));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function call(method: "PATCH" | "DELETE", body: unknown, done: string) {
    setBusy(true); setNote(null);
    const response = await fetch("/api/admin/site-content", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setBusy(false);
    setNote({ ok: response.ok, text: response.ok ? done : result.error ?? "Could not save." });
    return response.ok;
  }
  async function saveBusiness() { if (await call("PATCH", { key: "business", value: biz }, "Business details saved.")) setBizSaved(biz); }
  async function savePolicy(item: Item) {
    if (await call("PATCH", { key: `policy:${item.slug}`, value: { body: drafts[item.slug] } }, `${item.title} saved.`)) setList((current) => current.map((entry) => (entry.slug === item.slug ? { ...entry, body: drafts[item.slug], customised: true } : entry)));
  }
  async function resetPolicy(item: Item) {
    if (!window.confirm(`Put the original wording back for “${item.title}”? Your edits will be lost.`)) return;
    if (await call("DELETE", { key: `policy:${item.slug}` }, `${item.title} restored to the original wording.`)) { setDrafts((current) => ({ ...current, [item.slug]: item.defaultBody })); setList((current) => current.map((entry) => (entry.slug === item.slug ? { ...entry, body: item.defaultBody, customised: false } : entry))); }
  }

  return <div className="hp">
    <p className="hp-lead">These pages are shown to customers in your footer and are usually required by payment providers. The wording below is a general starting point — <b>please have it reviewed by the business owner or a legal adviser</b> before going live.</p>
    {note && <p className={note.ok ? "studio-note ok" : "studio-note bad"} role="status">{note.text}</p>}

    <section className="hp-card">
      <h2>Business details</h2>
      <p className="step-hint">Used in the policies and on the Contact page. Email, phone and GSTIN come from <a href="/admin/settings">Settings</a>.</p>
      <label>Registered business name<input value={biz.legalName} disabled={!canEdit} onChange={(event) => setBiz({ ...biz, legalName: event.target.value })} placeholder="e.g. Mobile & More" /></label>
      <label>Business address<textarea rows={3} value={biz.address} disabled={!canEdit} onChange={(event) => setBiz({ ...biz, address: event.target.value })} placeholder="Shop no., street, city, state, PIN" /></label>
      <button type="button" className="primary-button" disabled={!canEdit || busy || (biz.legalName === bizSaved.legalName && biz.address === bizSaved.address)} onClick={saveBusiness}>Save business details</button>
    </section>

    <section className="hp-card">
      <h2>Policy pages</h2>
      <ul className="pol-list">{list.map((item) => <li key={item.slug}>
        <details>
          <summary><div><b>{item.title}</b><small>{item.summary}</small></div><span className={item.customised ? "status-pill wait" : "status-pill on"}>{item.customised ? "Edited" : "Original"}</span></summary>
          <div className="pol-body">
            <textarea rows={18} value={drafts[item.slug]} disabled={!canEdit} onChange={(event) => setDrafts((current) => ({ ...current, [item.slug]: event.target.value }))} aria-label={`${item.title} text`} />
            <p className="step-hint">Format: start a line with <code>## </code> for a heading and <code>- </code> for a bullet; leave a blank line between paragraphs. Placeholders like <code>{"{{returnDays}}"}</code> fill in automatically.</p>
            <div className="ann-actions">
              <button type="button" className="primary-button" disabled={!canEdit || busy || drafts[item.slug] === item.body} onClick={() => savePolicy(item)}>Save</button>
              <button type="button" className="secondary-button" disabled={!canEdit || busy || !item.customised} onClick={() => resetPolicy(item)}>Restore original</button>
              <a className="link-button" href={`/policies/${item.slug}`} target="_blank" rel="noreferrer">View page ↗</a>
            </div>
          </div>
        </details>
      </li>)}</ul>
      <details className="hp-add"><summary>Placeholders you can use</summary><ul className="token-help">{TOKEN_HELP.map(([token, meaning]) => <li key={token}><code>{token}</code> — {meaning}</li>)}</ul></details>
    </section>
  </div>;
}
