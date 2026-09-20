"use client";
import { useState } from "react";
import type { Announcement } from "@/lib/site-content";

type Note = { ok: boolean; text: string } | null;

export function AnnouncementEditor({ initial, defaults, canEdit }: { initial: Announcement; defaults: string[]; canEdit: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [messages, setMessages] = useState(initial.messages);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const dirty = enabled !== saved.enabled || JSON.stringify(messages) !== JSON.stringify(saved.messages);
  const change = (index: number, value: string) => setMessages((list) => list.map((item, i) => (i === index ? value : item)));
  const move = (index: number, dir: -1 | 1) => setMessages((list) => { const next = [...list]; const to = index + dir; if (to < 0 || to >= next.length) return list; [next[index], next[to]] = [next[to], next[index]]; return next; });

  async function call(method: "PATCH" | "DELETE", body: unknown, done: string) {
    setBusy(true); setNote(null);
    const response = await fetch("/api/admin/site-content", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setBusy(false);
    setNote({ ok: response.ok, text: response.ok ? done : result.error ?? "Could not save." });
    return response.ok;
  }
  async function save() {
    const clean = messages.map((message) => message.trim()).filter(Boolean);
    if (!clean.length) { setNote({ ok: false, text: "Add at least one message." }); return; }
    if (await call("PATCH", { key: "announcement", value: { enabled, messages: clean } }, "Saved — the bar on your store is updated.")) { setSaved({ enabled, messages: clean }); setMessages(clean); }
  }
  async function reset() {
    if (!window.confirm("Put the original messages back?")) return;
    if (await call("DELETE", { key: "announcement" }, "Original messages restored.")) { setSaved({ enabled: true, messages: defaults }); setEnabled(true); setMessages(defaults); }
  }

  return <section className="hp-card">
    <div className="ann-head"><div><h2>Scrolling bar at the very top</h2><p className="step-hint">The dark strip above your header that slides across. Short, punchy messages work best.</p></div>
      <button type="button" role="switch" aria-checked={enabled} className={enabled ? "switch on" : "switch"} disabled={!canEdit} onClick={() => setEnabled(!enabled)}><span /><em>{enabled ? "Showing" : "Hidden"}</em></button>
    </div>
    <ul className="ann-list">{messages.map((message, index) => <li key={index}>
      <div className="hp-move"><button type="button" disabled={!canEdit || index === 0} onClick={() => move(index, -1)} aria-label="Move up">↑</button><button type="button" disabled={!canEdit || index === messages.length - 1} onClick={() => move(index, 1)} aria-label="Move down">↓</button></div>
      <input value={message} maxLength={140} disabled={!canEdit} onChange={(event) => change(index, event.target.value)} aria-label={`Message ${index + 1}`} placeholder="e.g. Free delivery over ₹499" />
      <button type="button" className="ann-remove" disabled={!canEdit || messages.length === 1} onClick={() => setMessages((list) => list.filter((_, i) => i !== index))} aria-label="Remove message">✕</button>
    </li>)}</ul>
    <div className="ann-actions">
      <button type="button" className="secondary-button" disabled={!canEdit || messages.length >= 10} onClick={() => setMessages((list) => [...list, ""])}>+ Add a message</button>
      <button type="button" className="primary-button" disabled={!canEdit || busy || !dirty} onClick={save}>{busy ? "Saving…" : dirty ? "Save bar" : "Saved"}</button>
      <button type="button" className="link-button" disabled={!canEdit || busy} onClick={reset}>Restore original messages</button>
    </div>
    <div className="ann-preview" aria-hidden="true">{enabled ? messages.filter(Boolean).join("   ✦   ") || "—" : "The bar is hidden on your store."}</div>
    {note && <p className={note.ok ? "studio-note ok" : "studio-note bad"} role="status">{note.text}</p>}
  </section>;
}
