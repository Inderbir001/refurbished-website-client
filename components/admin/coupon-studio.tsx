"use client";
import { useState } from "react";
import { inr } from "@/lib/money";

export type CouponRow = { id: string; code: string; type: "PERCENTAGE" | "FIXED"; value: number; minimumOrder: number | null; maximumDiscount: number | null; expiresAt: string | null; isActive: boolean; usedCount: number; usageLimit: number | null; firstOrderOnly: boolean; scopeType: string };
type Note = { ok: boolean; text: string } | null;
const paise = (rupees: string) => Math.round(Number(rupees) * 100);

function describe(coupon: CouponRow) {
  const off = coupon.type === "PERCENTAGE" ? `${coupon.value}% off` : `${inr(coupon.value)} off`;
  const parts = [off, coupon.minimumOrder ? `orders above ${inr(coupon.minimumOrder)}` : "any order"];
  if (coupon.type === "PERCENTAGE" && coupon.maximumDiscount) parts.push(`up to ${inr(coupon.maximumDiscount)}`);
  if (coupon.firstOrderOnly) parts.push("first order only");
  if (coupon.scopeType !== "ORDER") parts.push("selected products");
  return parts.join(" · ");
}
function status(coupon: CouponRow) {
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { label: "Expired", tone: "off" };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return { label: "Used up", tone: "off" };
  return coupon.isActive ? { label: "Live", tone: "on" } : { label: "Paused", tone: "wait" };
}

export function CouponStudio({ initial }: { initial: CouponRow[] }) {
  const [coupons, setCoupons] = useState(initial);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");

  async function toggle(coupon: CouponRow) {
    setBusy(true); setNote(null);
    const response = await fetch("/api/admin/coupons", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setNote({ ok: false, text: result.error ?? "Could not update the coupon." }); return; }
    setCoupons((list) => list.map((item) => (item.id === coupon.id ? { ...item, isActive: !coupon.isActive } : item)));
    setNote({ ok: true, text: `${coupon.code} is now ${coupon.isActive ? "paused" : "live"}.` });
  }

  async function create(form: FormData) {
    const value = Number(form.get("value"));
    const expires = String(form.get("expires") ?? "");
    const body: Record<string, unknown> = {
      code: String(form.get("code") ?? "").trim(),
      type,
      value: type === "PERCENTAGE" ? value : paise(String(form.get("value"))),
      firstOrderOnly: form.get("firstOrder") === "on",
    };
    if (form.get("minimum")) body.minimumOrder = paise(String(form.get("minimum")));
    if (type === "PERCENTAGE" && form.get("maximum")) body.maximumDiscount = paise(String(form.get("maximum")));
    if (expires) body.expiresAt = new Date(`${expires}T23:59:59+05:30`).toISOString();
    setBusy(true); setNote(null);
    const response = await fetch("/api/admin/coupons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setNote({ ok: false, text: result.error ?? "Could not create the coupon." }); return false; }
    setCoupons((list) => [result.data as CouponRow, ...list]);
    setNote({ ok: true, text: `Coupon ${result.data.code} is live. Customers can enter it in their cart.` });
    setOpen(false);
    return true;
  }

  return <section className="coupon-studio" id="coupons">
    <div className="studio-head"><div><h2>Coupon codes</h2><p>Codes customers type in their cart. Pause one any time.</p></div><button type="button" className="primary-button" onClick={() => setOpen(!open)}>{open ? "Close" : "+ New coupon"}</button></div>

    {open && <form className="coupon-form-simple" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; if (await create(new FormData(form))) form.reset(); }}>
      <div className="cf-row">
        <label>Code<input name="code" required minLength={3} maxLength={40} placeholder="e.g. FESTIVE10" style={{ textTransform: "uppercase" }} /></label>
        <div className="cf-type" role="group" aria-label="Discount type"><button type="button" className={type === "PERCENTAGE" ? "on" : ""} onClick={() => setType("PERCENTAGE")}>% off</button><button type="button" className={type === "FIXED" ? "on" : ""} onClick={() => setType("FIXED")}>₹ off</button></div>
        <label>{type === "PERCENTAGE" ? "Percent off" : "Rupees off"}<input name="value" type="number" required min={1} max={type === "PERCENTAGE" ? 100 : undefined} step={type === "PERCENTAGE" ? 1 : "any"} placeholder={type === "PERCENTAGE" ? "10" : "200"} /></label>
      </div>
      <div className="cf-row">
        <label>Minimum order (₹)<input name="minimum" type="number" min={0} step="any" placeholder="optional" /></label>
        {type === "PERCENTAGE" && <label>Biggest discount (₹)<input name="maximum" type="number" min={1} step="any" placeholder="optional" /></label>}
        <label>Valid until<input name="expires" type="date" min={new Date().toISOString().slice(0, 10)} /></label>
      </div>
      <label className="cf-check"><input type="checkbox" name="firstOrder" /> First order only</label>
      <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Create coupon"}</button>
    </form>}

    {note && <p className={note.ok ? "studio-note ok" : "studio-note bad"} role="status">{note.text}</p>}

    {coupons.length ? <ul className="coupon-list">{coupons.map((coupon) => { const state = status(coupon); return <li key={coupon.id} className={`cl ${state.tone}`}>
      <code>{coupon.code}</code>
      <div><b>{describe(coupon)}</b><small>Used {coupon.usedCount}{coupon.usageLimit ? ` of ${coupon.usageLimit}` : ""} times{coupon.expiresAt ? ` · ends ${new Date(coupon.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}</small></div>
      <span className={`status-pill ${state.tone}`}>{state.label}</span>
      <button type="button" disabled={busy || state.label === "Expired" || state.label === "Used up"} onClick={() => toggle(coupon)}>{coupon.isActive ? "Pause" : "Resume"}</button>
    </li>; })}</ul> : <p className="step-hint">No coupons yet. Click “+ New coupon” to make the first one.</p>}
  </section>;
}
