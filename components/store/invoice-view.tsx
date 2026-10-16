"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { safeFetch } from "@/lib/safe-fetch";
import type { InvoiceData } from "@/lib/services/invoice-service";

const rupees = (paise: number) => (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// Printable invoice. "Print / Save as PDF" uses the browser's own print dialog; the page chrome is hidden when printing.
export function InvoiceView({ orderId, backHref, isAdmin = false }: { orderId: string; backHref: string; isAdmin?: boolean }) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    safeFetch(`/api/orders/${orderId}/invoice`).then((response) => response.json().then((body) => ({ ok: response.ok, body }))).then(({ ok, body }) => { if (!live) return; if (ok) setInvoice(body.data); else setError(body.error ?? "The invoice could not be loaded."); });
    return () => { live = false; };
  }, [orderId]);

  if (error) return <section className="page-shell"><p className="form-error" role="alert">{error}</p><Link className="text-link" href={backHref}>← Back to the order</Link></section>;
  if (!invoice) return <section className="page-shell"><p>Preparing your invoice…</p></section>;
  const i = invoice;
  const money = (paise: number) => `₹${rupees(paise)}`;
  return <section className="invoice-page">
    <div className="invoice-actions no-print"><Link className="text-link" href={backHref}>← Back to the order</Link><button type="button" className="primary-button" onClick={() => window.print()}>Print / Save as PDF</button></div>
    {isAdmin && !i.seller.gstin && <p className="form-error no-print">Your GSTIN is not set, so it does not appear on invoices. Add it in Admin → Settings. Add your legal name and registered address under Admin → Policies → Business details.</p>}
    <article className="invoice-sheet">
      <header className="invoice-head">
        <div>
          {i.seller.logoUrl && <img className="invoice-logo" src={i.seller.logoUrl} alt={i.seller.name} />}
          <h1>{i.title}</h1>
          <p className="invoice-sub">{i.detailed ? "Original for recipient" : "Customer invoice"}</p>
        </div>
        <dl className="invoice-meta">
          <div><dt>Invoice no.</dt><dd>{i.number}</dd></div>
          <div><dt>Invoice date</dt><dd>{day(i.issuedAt)}</dd></div>
          <div><dt>Order no.</dt><dd>{i.orderNumber}</dd></div>
          <div><dt>Order date</dt><dd>{day(i.orderDate)}</dd></div>
        </dl>
      </header>

      <div className="invoice-parties">
        <div>
          <h2>Sold by</h2>
          <p><b>{i.seller.legalName}</b></p>
          {i.seller.name !== i.seller.legalName && <p>Trading as {i.seller.name}</p>}
          {i.seller.address && <p className="pre">{i.seller.address}</p>}
          {i.seller.gstin && <p>GSTIN: <b>{i.seller.gstin}</b></p>}
          {i.seller.pan && <p>PAN: {i.seller.pan}</p>}
          {i.seller.state && <p>State: {i.seller.state}</p>}
          {(i.seller.email || i.seller.phone) && <p>{[i.seller.email, i.seller.phone].filter(Boolean).join(" · ")}</p>}
        </div>
        <div>
          <h2>Billed to</h2>
          <p><b>{i.buyer.businessName || i.buyer.name}</b></p>
          {i.buyer.businessName && i.buyer.name && <p>Attn: {i.buyer.name}</p>}
          {i.buyer.address.map((line) => <p key={line}>{line}</p>)}
          {i.buyer.phone && <p>Phone: {i.buyer.phone}</p>}
          {i.buyer.gstin && <p>GSTIN: <b>{i.buyer.gstin}</b></p>}
          {i.detailed && <p>Place of supply: <b>{i.placeOfSupply}</b></p>}
        </div>
      </div>

      <div className="invoice-table-wrap">
        {i.detailed ? <table className="invoice-table">
          <thead><tr><th>#</th><th>Description</th><th>HSN</th><th className="r">Qty</th><th className="r">{i.inclusive ? "Rate (incl. GST)" : "Rate"}</th><th className="r">Taxable value</th>{i.supply === "INTRA" ? <><th className="r">CGST</th><th className="r">SGST</th></> : <th className="r">IGST</th>}<th className="r">Amount</th></tr></thead>
          <tbody>{i.lines.map((line, index) => <tr key={line.sku + index}>
            <td>{index + 1}</td><td>{line.description}<small>SKU {line.sku}</small></td><td>{line.hsn || "–"}</td><td className="r">{line.quantity}</td><td className="r">{rupees(line.unitPrice)}</td><td className="r">{rupees(line.taxable)}</td>
            {i.supply === "INTRA" ? <><td className="r">{rupees(line.cgst)}<small>@{line.rate / 2}%</small></td><td className="r">{rupees(line.sgst)}<small>@{line.rate / 2}%</small></td></> : <td className="r">{rupees(line.igst)}<small>@{line.rate}%</small></td>}
            <td className="r">{rupees(line.total)}</td></tr>)}</tbody>
        </table> : <table className="invoice-table">
          <thead><tr><th>#</th><th>Description</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Amount</th></tr></thead>
          <tbody>{i.lines.map((line, index) => <tr key={line.sku + index}><td>{index + 1}</td><td>{line.description}<small>SKU {line.sku}</small></td><td className="r">{line.quantity}</td><td className="r">{rupees(line.unitPrice)}</td><td className="r">{rupees(line.total)}</td></tr>)}</tbody>
        </table>}
      </div>

      <div className="invoice-bottom">
        <div className="invoice-words">
          <p className="invoice-label">Amount in words</p>
          <p><b>{i.amountInWords}</b></p>
          {i.gateway && <p className="invoice-label" style={{ marginTop: 14 }}>Payment</p>}
          {i.gateway && <p>Paid online via {i.gateway.charAt(0) + i.gateway.slice(1).toLowerCase()}{i.paymentRef ? ` · ref ${i.paymentRef}` : ""}</p>}
        </div>
        <dl className="invoice-totals">
          <div><dt>Items total</dt><dd>{money(i.subtotal)}</dd></div>
          {i.discount > 0 && <div><dt>Discount{i.couponCode ? ` (${i.couponCode})` : ""}</dt><dd>−{money(i.discount)}</dd></div>}
          <div><dt>Shipping</dt><dd>{i.shipping ? money(i.shipping) : "Free"}</dd></div>
          {i.roundOff !== 0 && <div><dt>Round off</dt><dd>{i.roundOff > 0 ? "" : "−"}{money(Math.abs(i.roundOff))}</dd></div>}
          <div className="grand"><dt>Total</dt><dd>{money(i.total)}</dd></div>
          {i.detailed ? <>
            <div className="sub"><dt>Taxable value</dt><dd>{money(i.taxable)}</dd></div>
            {i.supply === "INTRA" ? <><div className="sub"><dt>CGST</dt><dd>{money(i.cgst)}</dd></div><div className="sub"><dt>SGST</dt><dd>{money(i.sgst)}</dd></div></> : <div className="sub"><dt>IGST</dt><dd>{money(i.igst)}</dd></div>}
          </> : <div className="sub"><dt>{i.inclusive ? "Includes GST of" : "GST charged"}</dt><dd>{money(i.tax)}</dd></div>}
        </dl>
      </div>

      <div className="invoice-foot">
        <p>{i.inclusive ? "All prices include GST." : "GST is included in the amounts shown."} Shipping is charged separately where applicable. This is a computer-generated invoice and does not need a signature.</p>
        <p>Goods once sold can be returned only as per our Returns &amp; Refunds Policy.</p>
        {i.footerNote && <p className="pre">{i.footerNote}</p>}
      </div>
    </article>
  </section>;
}
