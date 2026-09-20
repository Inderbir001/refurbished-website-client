import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import { fillTokens, findPolicy, parseBlocks, POLICIES } from "@/lib/policies";
import { loadStoreContact } from "@/lib/policy-context";
import { readContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const policy = findPolicy((await params).slug);
  return policy ? { title: policy.title, description: policy.summary, alternates: { canonical: `/policies/${policy.slug}` } } : { title: "Page not found" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const policy = findPolicy((await params).slug);
  if (!policy) notFound();
  const [context, override] = await Promise.all([loadStoreContact(), readContent<{ body: string }>(`policy:${policy.slug}`)]);
  const blocks = parseBlocks(fillTokens(override?.value.body ?? policy.body, context.vars));
  const updated = override?.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return <section className="policy-shell page-shell">
    <div role="navigation" aria-label="Policies" className="policy-list">
      <p className="eyebrow">POLICIES</p>
      {POLICIES.map((item) => <Link key={item.slug} href={`/policies/${item.slug}`} className={item.slug === policy.slug ? "on" : ""}>{item.title}</Link>)}
      <Link href="/contact">Contact us</Link>
    </div>
    <article className="policy-article">
      <p className="eyebrow">{brand.name.toUpperCase()}</p>
      <h1>{policy.title}</h1>
      {updated && <p className="policy-updated">Last updated {updated}</p>}
      {blocks.map((block, index) => block.type === "h2" ? <h2 key={index}>{block.text}</h2> : block.type === "ul" ? <ul key={index}>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p key={index} className="policy-text">{block.text}</p>)}
      <div className="policy-cta"><b>Questions?</b><span>We are happy to help.</span><Link className="primary-button" href="/contact">Contact us</Link></div>
    </article>
  </section>;
}
