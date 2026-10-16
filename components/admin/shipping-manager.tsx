"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/lib/safe-fetch";
import { inr } from "@/lib/money";

export type ShippingRuleRow = { id: string; name: string; states: string[]; pincodes: string[]; charge: number; freeShippingThreshold: number | null; minimumOrder: number | null; maximumOrder: number | null; estimatedDaysMin: number; estimatedDaysMax: number; priority: number; isActive: boolean };
type Scope = "all" | "states" | "pincodes";
type Draft = { id?: string; name: string; scope: Scope; states: string[]; pincodes: string; charge: string; freeOver: string; daysMin: string; daysMax: string; priority: string; minOrder: string; maxOrder: string; isActive: boolean };

const STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
const rupees = (paise: number | null) => (paise == null ? "" : String(paise / 100));
const toPaise = (value: string) => Math.round(Number(value) * 100);
const blank = (priority: number): Draft => ({ name: "", scope: "all", states: [], pincodes: "", charge: "", freeOver: "", daysMin: "3", daysMax: "7", priority: String(priority), minOrder: "", maxOrder: "", isActive: true });
const fromRule = (rule: ShippingRuleRow): Draft => ({ id: rule.id, name: rule.name, scope: rule.pincodes.length ? "pincodes" : rule.states.length ? "states" : "all", states: rule.states, pincodes: rule.pincodes.join(", "), charge: rupees(rule.charge), freeOver: rupees(rule.freeShippingThreshold), daysMin: String(rule.estimatedDaysMin), daysMax: String(rule.estimatedDaysMax), priority: String(rule.priority), minOrder: rupees(rule.minimumOrder), maxOrder: rupees(rule.maximumOrder), isActive: rule.isActive });
const where = (rule: ShippingRuleRow) => rule.pincodes.length ? `${rule.pincodes.length} pincode${rule.pincodes.length === 1 ? "" : "s"}` : rule.states.length ? (rule.states.length <= 2 ? rule.states.join(", ") : `${rule.states.length} states`) : "All India";

// Admin → Delivery: every delivery option as a card with edit / turn off / delete, and one form (in a pop-up) for adding or editing.
export function ShippingManager({ rules, defaultFreeOver }: { rules: ShippingRuleRow[]; defaultFreeOver: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ShippingRuleRow | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const nextPriority = useMemo(() => (rules.length ? Math.max(...rules.map((rule) => rule.priority)) + 1 : 0), [rules]);

  useEffect(() => {
    if (!draft && !confirmDelete) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) { setDraft(null); setConfirmDelete(null); } };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    if (draft) setTimeout(() => firstField.current?.focus(), 30);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [draft === null, confirmDelete === null, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  async function call(method: "POST" | "PATCH" | "DELETE", body?: object, query = "") {
    const response = await safeFetch(`/api/admin/shipping-rules${query}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "That could not be saved.");
    return result;
  }
  const payload = (d: Draft) => ({
    ...(d.id ? { id: d.id } : {}), name: d.name.trim(),
    states: d.scope === "states" ? d.states : [], pincodes: d.scope === "pincodes" ? d.pincodes.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean) : [],
    charge: toPaise(d.charge || "0"), freeShippingThreshold: d.freeOver.trim() === "" ? null : toPaise(d.freeOver),
    minimumOrder: d.minOrder.trim() === "" ? null : toPaise(d.minOrder), maximumOrder: d.maxOrder.trim() === "" ? null : toPaise(d.maxOrder),
    estimatedDaysMin: Number(d.daysMin), estimatedDaysMax: Number(d.daysMax), priority: Number(d.priority || 0), isActive: d.isActive,
  });
  async function save() {
    if (!draft) return;
    setError("");
    if (draft.name.trim().length < 2) return setError("Give this delivery option a name, for example “Standard delivery”.");
    if (draft.scope === "states" && !draft.states.length) return setError("Choose at least one state, or switch to “All India”.");
    if (draft.scope === "pincodes" && !payload(draft).pincodes.length) return setError("Enter at least one 6-digit pincode, or switch to “All India”.");
    if (!(Number(draft.charge || "0") >= 0)) return setError("The delivery charge must be 0 or more.");
    if (!(Number(draft.daysMin) >= 1) || !(Number(draft.daysMax) >= Number(draft.daysMin))) return setError("Delivery days: the maximum must be at least the minimum, and at least 1.");
    setBusy(true);
    try { await call(draft.id ? "PATCH" : "POST", payload(draft)); setNotice(draft.id ? "Delivery option updated." : "Delivery option added."); setDraft(null); router.refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "That could not be saved."); }
    setBusy(false);
  }
  async function toggle(rule: ShippingRuleRow) {
    setBusy(true); setNotice("");
    try { await call("PATCH", payload({ ...fromRule(rule), isActive: !rule.isActive })); setNotice(`${rule.name} is now ${rule.isActive ? "off" : "on"}.`); router.refresh(); }
    catch (caught) { setNotice(caught instanceof Error ? caught.message : "That could not be changed."); }
    setBusy(false);
  }
  async function remove() {
    if (!confirmDelete) return;
    setBusy(true);
    try { await call("DELETE", undefined, `?id=${encodeURIComponent(confirmDelete.id)}`); setNotice(`“${confirmDelete.name}” was deleted.`); setConfirmDelete(null); router.refresh(); }
    catch (caught) { setNotice(caught instanceof Error ? caught.message : "That could not be deleted."); setConfirmDelete(null); }
    setBusy(false);
  }

  const set = (patch: Partial<Draft>) => { setError(""); setDraft((current) => (current ? { ...current, ...patch } : current)); };
  const activeCount = rules.filter((rule) => rule.isActive).length;
  const preview = draft ? `${draft.scope === "all" ? "Everyone in India" : draft.scope === "states" ? (draft.states.length ? `Customers in ${draft.states.length <= 3 ? draft.states.join(", ") : `${draft.states.length} states`}` : "Customers in the states you choose") : "Customers at the pincodes you list"} pay ${Number(draft.charge || 0) === 0 ? "nothing" : `₹${Number(draft.charge)}`}${draft.freeOver.trim() !== "" && Number(draft.freeOver) > 0 ? `, free above ₹${Number(draft.freeOver)}` : ""}. Arrives in ${draft.daysMin || "?"}–${draft.daysMax || "?"} days.` : "";

  return <div className="ship-admin">
    <div className="ship-head">
      <div><p className="ship-lead">Delivery options are what customers choose from at checkout. They only see options that match their address and order value; the lowest priority number comes first and is pre-selected.</p></div>
      <button type="button" className="primary-button" onClick={() => { setError(""); setNotice(""); setDraft(blank(nextPriority)); }}>+ Add delivery option</button>
    </div>
    {notice && <p className="ship-notice" role="status">{notice}</p>}
    {rules.length === 0
      ? <div className="empty-state"><h3>No delivery options yet</h3><p>Until you add one, customers see a single “Standard delivery” at ₹99, free above {inr(defaultFreeOver)}. Add your own to set the price, areas and delivery time.</p></div>
      : <div className="ship-list">{rules.map((rule) => <article key={rule.id} className={rule.isActive ? "ship-card" : "ship-card off"}>
        <div className="ship-main"><h3>{rule.name}</h3><div className="ship-tags"><span>📍 {where(rule)}</span><span>🕒 {rule.estimatedDaysMin}–{rule.estimatedDaysMax} days</span><span>#{rule.priority} in order</span>{(rule.minimumOrder != null || rule.maximumOrder != null) && <span>Orders {rule.minimumOrder != null ? `from ${inr(rule.minimumOrder)}` : ""}{rule.maximumOrder != null ? ` up to ${inr(rule.maximumOrder)}` : ""}</span>}</div></div>
        <div className="ship-price"><b>{rule.charge === 0 ? "Free" : inr(rule.charge)}</b><small>{rule.freeShippingThreshold != null && rule.freeShippingThreshold > 0 ? `free over ${inr(rule.freeShippingThreshold)}` : "no free threshold"}</small></div>
        <label className="ship-switch" title={rule.isActive ? "Turn off" : "Turn on"}><input type="checkbox" checked={rule.isActive} disabled={busy} onChange={() => toggle(rule)} /><span aria-hidden /><em>{rule.isActive ? "On" : "Off"}</em></label>
        <div className="ship-actions"><button type="button" className="secondary-button" onClick={() => { setError(""); setNotice(""); setDraft(fromRule(rule)); }}>Edit</button><button type="button" className="ship-delete" onClick={() => { setNotice(""); setConfirmDelete(rule); }}>Delete</button></div>
      </article>)}</div>}
    {rules.length > 0 && activeCount === 0 && <p className="form-error">All your delivery options are off, so customers see the plain “Standard delivery” fallback. Turn one on.</p>}

    {draft && <div className="ship-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDraft(null); }}>
      <form className="ship-modal" role="dialog" aria-modal="true" aria-label={draft.id ? "Edit delivery option" : "Add delivery option"} onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <header><h2>{draft.id ? "Edit delivery option" : "Add delivery option"}</h2><button type="button" aria-label="Close" onClick={() => !busy && setDraft(null)}>×</button></header>
        <div className="ship-body">
          <label className="ship-field">Name shown to customers<input ref={firstField} value={draft.name} onChange={(event) => set({ name: event.target.value })} placeholder="Standard delivery" maxLength={80} /></label>
          <fieldset className="ship-field"><legend>Where does it deliver?</legend>
            <div className="ship-scope">{([["all", "All India"], ["states", "Selected states"], ["pincodes", "Selected pincodes"]] as const).map(([value, label]) => <label key={value} className={draft.scope === value ? "on" : ""}><input type="radio" name="scope" checked={draft.scope === value} onChange={() => set({ scope: value })} />{label}</label>)}</div>
            {draft.scope === "states" && <div className="ship-states">{[...new Set([...STATES, ...draft.states])].map((state) => <label key={state}><input type="checkbox" checked={draft.states.includes(state)} onChange={(event) => set({ states: event.target.checked ? [...draft.states, state] : draft.states.filter((item) => item !== state) })} />{state}</label>)}</div>}
            {draft.scope === "pincodes" && <textarea value={draft.pincodes} onChange={(event) => set({ pincodes: event.target.value })} rows={3} placeholder="560001, 560002, 560003" />}
          </fieldset>
          <div className="ship-grid">
            <label className="ship-field">Delivery charge (₹)<input type="number" min="0" step="1" inputMode="decimal" value={draft.charge} onChange={(event) => set({ charge: event.target.value })} placeholder="0 for free" /></label>
            <label className="ship-field">Free above order value (₹)<input type="number" min="0" step="1" inputMode="decimal" value={draft.freeOver} onChange={(event) => set({ freeOver: event.target.value })} placeholder="Leave empty if never free" /></label>
            <label className="ship-field">Delivery time, from (days)<input type="number" min="1" value={draft.daysMin} onChange={(event) => set({ daysMin: event.target.value })} /></label>
            <label className="ship-field">Delivery time, up to (days)<input type="number" min="1" value={draft.daysMax} onChange={(event) => set({ daysMax: event.target.value })} /></label>
          </div>
          <details className="ship-advanced"><summary>More options</summary>
            <div className="ship-grid">
              <label className="ship-field">Order position<input type="number" min="0" value={draft.priority} onChange={(event) => set({ priority: event.target.value })} /><small>Lowest number is shown first and pre-selected.</small></label>
              <span />
              <label className="ship-field">Only for orders from (₹)<input type="number" min="0" value={draft.minOrder} onChange={(event) => set({ minOrder: event.target.value })} placeholder="No minimum" /></label>
              <label className="ship-field">Only for orders up to (₹)<input type="number" min="0" value={draft.maxOrder} onChange={(event) => set({ maxOrder: event.target.value })} placeholder="No maximum" /></label>
            </div>
          </details>
          <label className="ship-check"><input type="checkbox" checked={draft.isActive} onChange={(event) => set({ isActive: event.target.checked })} /> Available to customers</label>
          <p className="ship-preview"><b>Preview:</b> {preview}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <footer><button type="button" className="secondary-button" disabled={busy} onClick={() => setDraft(null)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : draft.id ? "Save changes" : "Add delivery option"}</button></footer>
      </form>
    </div>}

    {confirmDelete && <div className="ship-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setConfirmDelete(null); }}>
      <div className="ship-modal small" role="alertdialog" aria-modal="true" aria-label="Delete delivery option">
        <header><h2>Delete “{confirmDelete.name}”?</h2></header>
        <div className="ship-body"><p>Customers will no longer see this option at checkout. Orders already placed are not affected.{confirmDelete.isActive && activeCount === 1 ? " This is your only active option, so customers will get the plain “Standard delivery” fallback until you add another." : ""}</p><p className="ship-hint">Not sure? Turn it off instead; you can switch it back on any time.</p></div>
        <footer><button type="button" className="secondary-button" disabled={busy} onClick={() => setConfirmDelete(null)}>Keep it</button><button type="button" className="ship-delete solid" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete"}</button></footer>
      </div>
    </div>}
  </div>;
}
