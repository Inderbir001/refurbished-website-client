import type { Metadata } from "next";
import Link from "next/link";
import { loadStoreContact } from "@/lib/policy-context";
import { POLICIES } from "@/lib/policies";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact us", description: "Get in touch with our support team.", alternates: { canonical: "/contact" } };

export default async function Contact() {
  const info = await loadStoreContact();
  const cards = [
    info.email && { title: "Email", value: info.email, href: `mailto:${info.email}`, note: "We reply within one working day." },
    info.phone && { title: "Phone", value: info.phone, href: `tel:${info.phone.replace(/[^+\d]/g, "")}`, note: "For urgent order questions." },
    info.address && { title: "Address", value: info.address, href: undefined, note: "Registered business address." },
  ].filter(Boolean) as { title: string; value: string; href?: string; note: string }[];
  return <section className="page-shell contact-page">
    <p className="eyebrow">WE ARE HERE TO HELP</p>
    <h1>Contact us</h1>
    <p className="contact-lead">Questions about an order, a return or a product? Reach us using the details below and mention your order number so we can help faster.</p>
    {cards.length ? <div className="contact-cards" data-reveal-group>{cards.map((card) => <article key={card.title}><small>{card.title}</small>{card.href ? <a href={card.href}>{card.value}</a> : <b>{card.value}</b>}<span>{card.note}</span></article>)}</div> : <div className="empty-state"><h3>Contact details are being set up.</h3><p>Please check back soon.</p></div>}
    {info.gstin && <p className="contact-gst">{info.legalName} · GSTIN {info.gstin}</p>}
    <div className="contact-links"><b>Helpful pages</b>{POLICIES.map((policy) => <Link key={policy.slug} href={`/policies/${policy.slug}`}>{policy.title}</Link>)}</div>
  </section>;
}
