"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/lib/safe-fetch";

export type SettingsValue = { storeName: string; currency: string; supportEmail: string; supportPhone: string; defaultTaxRate: number; freeShippingThreshold: number; cancellationHours: number; returnDays: number; defaultGateway: string; razorpayEnabled: boolean; phonePeEnabled: boolean; snapmitEnabled: boolean; sandboxMode: boolean };

// Admin → Settings in four short sections. GST number, logo and invoice details live on the Invoices page.
export function SettingsForm({ value }: { value: SettingsValue }) {
  const router = useRouter();
  const [razorpay, setRazorpay] = useState(value.razorpayEnabled);
  const [phonePe, setPhonePe] = useState(value.phonePeEnabled);
  const [snapmint, setSnapmint] = useState(value.snapmitEnabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const enabled = [razorpay && "RAZORPAY", phonePe && "PHONEPE", snapmint && "SNAPMIT"].filter(Boolean) as string[];

  async function save(form: FormData) {
    setBusy(true); setMessage(null);
    const gateway = enabled.includes(String(form.get("defaultGateway"))) ? String(form.get("defaultGateway")) : enabled[0] ?? value.defaultGateway;
    const body = {
      storeName: form.get("storeName"), currency: String(form.get("currency") || "INR").toUpperCase(), supportEmail: form.get("supportEmail"), supportPhone: form.get("supportPhone"),
      defaultTaxRate: Number(form.get("defaultTaxRate")), freeShippingThreshold: Math.round(Number(form.get("freeShippingThreshold") || 0) * 100),
      cancellationHours: Number(form.get("cancellationHours")), returnDays: Number(form.get("returnDays")), defaultGateway: gateway,
      paymentConfig: { razorpayEnabled: razorpay, phonePeEnabled: phonePe, snapmitEnabled: snapmint, sandboxMode: value.sandboxMode },
    };
    const response = await safeFetch("/api/admin/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? { ok: true, text: "Settings saved." } : { ok: false, text: result.error ?? "The settings could not be saved." });
    if (response.ok) router.refresh();
  }

  return <form action={save} className="adm-page" style={{ padding: 0, maxWidth: "none" }}>
    <section className="adm-card">
      <h2>Store details<small className="adm-card-sub">Shown to customers on the site, in emails and on invoices.</small></h2>
      <div className="adm-grid">
        <label className="adm-field">Store name<input name="storeName" defaultValue={value.storeName} required minLength={2} /></label>
        <label className="adm-field">Currency<input name="currency" defaultValue={value.currency} maxLength={3} /><small>Leave as INR for rupees.</small></label>
        <label className="adm-field">Support email<input name="supportEmail" type="email" defaultValue={value.supportEmail} placeholder="support@yourstore.com" /></label>
        <label className="adm-field">Support phone<input name="supportPhone" defaultValue={value.supportPhone} placeholder="+91 …" /></label>
      </div>
      <p className="adm-hint">Your GST number, logo and registered address are on the <Link href="/admin/invoices">Invoices</Link> page.</p>
    </section>

    <section className="adm-card">
      <h2>Payments<small className="adm-card-sub">Which ways customers can pay. Razorpay covers UPI, cards, net banking and wallets.</small></h2>
      <label className="adm-switch"><input type="checkbox" checked={razorpay} onChange={(event) => setRazorpay(event.target.checked)} /><i /><span>Razorpay<small>UPI, cards, net banking, wallets</small></span></label>
      <label className="adm-switch"><input type="checkbox" checked={phonePe} onChange={(event) => setPhonePe(event.target.checked)} /><i /><span>PhonePe<small>Needs PhonePe merchant details to work</small></span></label>
      <label className="adm-switch"><input type="checkbox" checked={snapmint} onChange={(event) => setSnapmint(event.target.checked)} /><i /><span>Snapmint (EMI)<small>Needs a Snapmint merchant account to work</small></span></label>
      {enabled.length > 1 && <label className="adm-field" style={{ maxWidth: 320 }}>Pre-selected at checkout<select name="defaultGateway" defaultValue={enabled.includes(value.defaultGateway) ? value.defaultGateway : enabled[0]}>{enabled.map((gateway) => <option key={gateway} value={gateway}>{gateway === "SNAPMIT" ? "Snapmint" : gateway === "PHONEPE" ? "PhonePe" : "Razorpay"}</option>)}</select></label>}
      {!enabled.length && <p className="adm-banner bad">No payment method is switched on, so customers cannot pay. Turn on at least one.</p>}
    </section>

    <section className="adm-card">
      <h2>Delivery and returns</h2>
      <div className="adm-grid three">
        <label className="adm-field">Free delivery above (₹)<span className="adm-money"><span>₹</span><input name="freeShippingThreshold" type="number" min="0" step="1" defaultValue={value.freeShippingThreshold / 100} /></span><small>Orders above this pay no delivery charge. Delivery options are under <Link href="/admin/shipping">Delivery</Link>.</small></label>
        <label className="adm-field">Return window (days)<input name="returnDays" type="number" min="0" max="90" defaultValue={value.returnDays} /><small>How long customers have to ask for a return after delivery.</small></label>
        <label className="adm-field">Free cancellation (hours)<input name="cancellationHours" type="number" min="0" max="720" defaultValue={value.cancellationHours} /><small>How long after ordering a customer can cancel.</small></label>
      </div>
    </section>

    <section className="adm-card">
      <h2>Tax</h2>
      <div className="adm-grid">
        <label className="adm-field">Default GST rate (%)<input name="defaultTaxRate" type="number" min="0" max="50" defaultValue={value.defaultTaxRate} /><small>Used for new products. Each product can have its own rate. See <Link href="/admin/tax">GST &amp; tax</Link>.</small></label>
      </div>
    </section>

    <div className="adm-bar">
      <button className="adm-btn primary" disabled={busy || !enabled.length}>{busy ? "Saving…" : "Save settings"}</button>
      <span className="spacer" />
      {message && <span className={`msg ${message.ok ? "ok" : "bad"}`} role="status">{message.text}</span>}
    </div>
  </form>;
}
