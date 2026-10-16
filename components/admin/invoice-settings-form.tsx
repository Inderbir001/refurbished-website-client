"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageField } from "@/components/admin/image-field";
import { financialYear, invoiceNumber, isValidGstin, isValidPan, normalizeGstin } from "@/lib/gst";
import { safeFetch } from "@/lib/safe-fetch";

export type InvoiceSettingsValue = { legalName: string; address: string; gstin: string; pan: string; prefix: string; footerNote: string; showLogo: boolean; logoUrl: string; storeName: string; email: string; phone: string; homeState: string };

// Admin → Invoices: one place for everything printed on an invoice, with a live preview of the "Sold by" block.
export function InvoiceSettingsForm({ value, nextNumber, sampleOrderId }: { value: InvoiceSettingsValue; nextNumber: number; sampleOrderId: string | null }) {
  const router = useRouter();
  const [v, setV] = useState(value);
  const [logo, setLogo] = useState(value.logoUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (patch: Partial<InvoiceSettingsValue>) => { setMessage(null); setV((current) => ({ ...current, ...patch })); };
  const gstin = normalizeGstin(v.gstin);
  const gstinOk = gstin === "" || isValidGstin(gstin);
  const panOk = v.pan.trim() === "" || isValidPan(v.pan);
  const prefix = v.prefix.trim().toUpperCase();
  const prefixOk = /^[A-Z0-9]{1,4}$/.test(prefix);
  const fy = financialYear();
  const checks: [string, boolean][] = [["Legal business name", Boolean(v.legalName.trim())], ["Registered address", Boolean(v.address.trim())], ["GST number", Boolean(gstin) && gstinOk], ["Home state (GST & tax page)", Boolean(v.homeState)], ["Logo", Boolean(logo)]];
  const ready = checks.every(([, ok]) => ok);

  async function save() {
    if (!gstinOk) return setMessage({ ok: false, text: "The GST number is not valid. It has 15 characters, like 29ABCDE1234F1Z5." });
    if (!panOk) return setMessage({ ok: false, text: "The PAN is not valid. It looks like ABCDE1234F." });
    if (!prefixOk) return setMessage({ ok: false, text: "The invoice prefix must be 1 to 4 letters or numbers, like MM." });
    setBusy(true); setMessage(null);
    const response = await safeFetch("/api/admin/invoice-settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ legalName: v.legalName, address: v.address, gstin, pan: v.pan, prefix, footerNote: v.footerNote, showLogo: v.showLogo, logoUrl: logo }) });
    const result = await response.json();
    setMessage(response.ok ? { ok: true, text: "Saved. New invoices use these details straight away." } : { ok: false, text: result.error ?? "That could not be saved." });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return <div className="invs">
    <aside className={ready ? "invs-check ready" : "invs-check"}>
      <h3>{ready ? "Ready to issue tax invoices" : "Finish these so invoices are complete"}</h3>
      <ul>{checks.map(([label, ok]) => <li key={label} className={ok ? "ok" : ""}>{ok ? "✓" : "○"} {label}</li>)}</ul>
      {!v.homeState && <p>Set your home state under <Link href="/admin/tax">GST &amp; tax</Link>. It decides CGST + SGST or IGST.</p>}
    </aside>

    <form className="invs-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <section className="invs-card">
        <h2>Business details <small>printed as “Sold by”</small></h2>
        <label className="invs-field">Legal business name<input value={v.legalName} onChange={(event) => set({ legalName: event.target.value })} placeholder="As registered, e.g. Mobile & More Traders" maxLength={160} /></label>
        <label className="invs-field">Registered address<textarea value={v.address} onChange={(event) => set({ address: event.target.value })} rows={3} placeholder={"Shop no., street, area\nCity, State - Pincode"} maxLength={400} /></label>
        <div className="invs-two">
          <label className="invs-field">GST number (GSTIN)<input value={v.gstin} onChange={(event) => set({ gstin: event.target.value.toUpperCase() })} maxLength={15} placeholder="29ABCDE1234F1Z5" aria-invalid={!gstinOk} />{!gstinOk && <small className="bad">Not a valid GST number yet.</small>}{gstin && gstinOk && <small className="good">Looks valid.</small>}</label>
          <label className="invs-field">PAN (optional)<input value={v.pan} onChange={(event) => set({ pan: event.target.value.toUpperCase() })} maxLength={10} placeholder="ABCDE1234F" aria-invalid={!panOk} />{!panOk && <small className="bad">Not a valid PAN yet.</small>}</label>
        </div>
        <p className="invs-note">Phone and email on invoices come from <Link href="/admin/settings">Settings</Link> ({[v.email, v.phone].filter(Boolean).join(" · ") || "not set yet"}).</p>
      </section>

      <section className="invs-card">
        <h2>Numbering</h2>
        <div className="invs-two">
          <label className="invs-field">Invoice prefix<input value={v.prefix} onChange={(event) => set({ prefix: event.target.value.toUpperCase() })} maxLength={4} aria-invalid={!prefixOk} /><small>1 to 4 letters or numbers.</small></label>
          <div className="invs-field"><span>Next invoice number</span><b className="invs-next">{prefixOk ? invoiceNumber(prefix, fy, nextNumber) : "—"}</b><small>Numbers run 1, 2, 3… and restart each financial year (April to March), with no gaps, as GST requires. Changing the prefix is safe: numbers keep counting.</small></div>
        </div>
      </section>

      <section className="invs-card">
        <h2>Look</h2>
        <ImageField name="logo" label="Logo" defaultValue={value.logoUrl} onValue={setLogo} hint="Shown at the top of the invoice." />
        <label className="invs-check-row"><input type="checkbox" checked={v.showLogo} onChange={(event) => set({ showLogo: event.target.checked })} /> Show the logo on invoices</label>
        <label className="invs-field">Footer note (optional)<textarea value={v.footerNote} onChange={(event) => set({ footerNote: event.target.value })} rows={3} maxLength={400} placeholder="For example: Warranty is provided by the seller for the period stated on the product page. Subject to Bengaluru jurisdiction." /><small>{v.footerNote.length}/400</small></label>
      </section>

      <section className="invs-card preview" aria-label="Preview">
        <h2>Preview <small>how the top of your invoice will read</small></h2>
        <div className="invs-sheet">
          <div className="invs-sheet-head">{v.showLogo && logo ? <img src={logo} alt="" /> : <b>{v.storeName}</b>}<div><small>INVOICE NO.</small><b>{prefixOk ? invoiceNumber(prefix, fy, nextNumber) : "—"}</b></div></div>
          <div className="invs-sheet-body">
            <div><small>SOLD BY</small><b>{v.legalName || "Your legal business name"}</b><span>{v.address || "Your registered address"}</span>{gstin && <span>GSTIN: <b>{gstin}</b></span>}{v.pan && <span>PAN: {v.pan}</span>}</div>
            <div><small>BILLED TO</small><b>Customer name</b><span>Customer address</span></div>
          </div>
          {v.footerNote && <p className="invs-sheet-foot">{v.footerNote}</p>}
        </div>
        {sampleOrderId ? <p className="invs-note">See it on a real order: <Link href={`/admin/orders/${sampleOrderId}/invoice`}>open your latest paid order’s invoice</Link> (save first).</p> : <p className="invs-note">Once you have a paid order, a link to its invoice appears here.</p>}
      </section>

      {message && <p className={message.ok ? "invs-msg ok" : "form-error"} role="status">{message.text}</p>}
      <div className="invs-save"><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save invoice settings"}</button></div>
    </form>
  </div>;
}
