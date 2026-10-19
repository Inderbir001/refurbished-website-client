import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/store/add-to-cart";
import { ProductGallery } from "@/components/store/product-gallery";
import { cookies } from "next/headers";
import { pageData } from "@/lib/page-data";
import { inr, priceFor } from "@/lib/money";
import { ReviewForm } from "@/components/store/review-form";
import { brand } from "@/lib/brand";
import { ProductDescription } from "@/components/store/product-description";
import { highlights, parseDescription, plainDescription } from "@/lib/description";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const token = (await cookies()).get("session")?.value;
  const { product } = await pageData("product", { slug: (await params).slug, token });
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? plainDescription(product.description),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description: plainDescription(product.description), images: product.images[0]?.url ? [product.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const token = (await cookies()).get("session")?.value;
  const { product, canReview, policy, sold = 0 } = await pageData("product", { slug: (await params).slug, token });
  if (!product) notFound();
  // Reviews are for buyers only: the form appears just for a signed-in customer with a delivered, paid order for this product (decided by the same one request).
  const price = priceFor(product.variants[0] ?? { price: null, salePrice: null }, product);
  const structuredData = {
    "@context": "https://schema.org", "@type": "Product", name: product.name, description: plainDescription(product.description, 5000),
    image: product.images.map((item) => item.url), sku: product.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: { "@type": "Offer", priceCurrency: "INR", price: (price / 100).toFixed(2), availability: product.variants.some((item) => item.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/products/${product.slug}` },
    aggregateRating: product.reviews.length ? { "@type": "AggregateRating", ratingValue: product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length, reviewCount: product.reviews.length } : undefined,
  };
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: process.env.NEXT_PUBLIC_APP_URL }, { "@type": "ListItem", position: 2, name: product.category?.name ?? "Products", item: `${process.env.NEXT_PUBLIC_APP_URL}/category/${product.category?.slug ?? ""}` }, { "@type": "ListItem", position: 3, name: product.name }] };
  const points = highlights(parseDescription(product.description));
  const average = product.reviews.length ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length : null;
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} /><section className="product-detail"><ProductGallery images={product.images.map((image) => ({ id: image.id, url: image.url, alt: image.alt }))} videos={product.videoUrls ?? []} name={product.name} /><div className="detail-copy"><p className="eyebrow">{product.condition.replace("_", " ")} · {product.brand?.name}</p><h1>{product.name}</h1>{average ? <div className="rating">{"★".repeat(Math.round(average))}{"☆".repeat(5 - Math.round(average))} <span>{average.toFixed(1)} from {product.reviews.length} reviews</span></div> : null}<div className="detail-price">{inr(price)} {product.basePrice > price && <del>{inr(product.basePrice)}</del>}</div>{product.basePrice > price && <p className="save-chip">You save {inr(product.basePrice - price)} · {Math.round(((product.basePrice - price) / product.basePrice) * 100)}% off</p>}<p className="tax-note">Inclusive of GST. Delivery charges, if any, are shown at checkout.</p>{points.length > 0 && <ul className="highlights" aria-label="Highlights">{points.map((point) => <li key={point}>{point}</li>)}</ul>}<div className="specs"><span><b>Condition</b>{product.condition}{product.grade ? ` · ${product.grade}` : ""}</span><span><b>Warranty</b>{product.warrantyMonths} months</span><span><b>Availability</b>{product.variants.some((item) => item.stock > 0) ? "In stock" : "Sold out"}</span></div><AddToCart productId={product.id} price={price} original={product.basePrice} sold={sold} variants={product.variants.map((variant) => ({ id: variant.id, title: variant.title, stock: variant.stock }))} /><ul className="trust-strip">{[
    ["Secure payment", "UPI, cards & net banking via Razorpay"],
    [`${policy.returnDays}-day returns`, "Request within the return window"],
    product.warrantyMonths > 0 ? [`${product.warrantyMonths >= 12 && product.warrantyMonths % 12 === 0 ? `${product.warrantyMonths / 12} year${product.warrantyMonths === 12 ? "" : "s"}` : `${product.warrantyMonths} months`} warranty`, "Seller warranty on this product"] : product.condition === "REFURBISHED" ? ["Quality checked", "Condition checked before listing"] : ["Tracked delivery", "Shipping charges shown at checkout"],
    policy.freeShippingThreshold > 0 ? [`Free delivery ${inr(policy.freeShippingThreshold)}+`, "On orders above the threshold"] : ["Pan-India delivery", "Charges shown at checkout"],
  ].map(([title, note]) => <li key={title}><b>{title}</b><span>{note}</span></li>)}</ul></div><section className="detail-bottom">{product.description.trim() && <><h2>About this product</h2><ProductDescription text={product.description} /></>}{product.specifications && Object.keys(product.specifications as Record<string, string>).length > 0 && <><h2>Product specifications</h2><div>{Object.entries(product.specifications as Record<string, string>).map(([key, value]) => <p key={key}><b>{key}</b><span>{value}</span></p>)}</div></>}<div className="acc-group"><details className="acc" open><summary>What&apos;s included</summary><p>{product.whatsIncluded ?? "The product, plus any accessories listed in its description."}</p></details><details className="acc"><summary>Condition &amp; warranty</summary><p>{brand.name} checks the condition of every device before it is listed. Personal device identifiers are never shown on this page.</p></details><details className="acc"><summary>Delivery &amp; returns</summary><p>Delivery charges and timing are worked out from your pincode at checkout. You can request a return within {policy.returnDays} days of delivery.</p></details></div><h2 id="reviews">Customer reviews{product.reviews.length ? ` (${product.reviews.length})` : ""}</h2>{product.reviews.length ? product.reviews.map((review) => <article className="customer-review" key={review.id}><b>{"★".repeat(review.rating)} · Verified purchase</b><p>{review.body}</p><small>{review.user.name}</small></article>) : <p>No published reviews yet.</p>}{canReview ? <ReviewForm productId={product.id} /> : <p className="review-note">Only customers who have bought and received this product can write a review.</p>}</section></section></>;
}
