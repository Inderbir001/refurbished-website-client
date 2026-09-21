import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/store/add-to-cart";
import { getProduct } from "@/lib/catalog";
import { inr, priceFor } from "@/lib/money";
import { ReviewForm } from "@/components/store/review-form";
import { brand } from "@/lib/brand";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.description.slice(0, 155),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description: product.description.slice(0, 155), images: product.images[0]?.url ? [product.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  // Reviews are for buyers only: the form appears just for a signed-in customer with a delivered, paid order for this product.
  const session = await currentSession();
  const canReview = session ? Boolean(await db.orderItem.findFirst({ where: { productId: product.id, order: { userId: session.sub, status: "DELIVERED", paymentStatus: "SUCCESS" } }, select: { id: true } })) : false;
  const price = priceFor(product.variants[0] ?? { price: null, salePrice: null }, product);
  const structuredData = {
    "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description,
    image: product.images.map((item) => item.url), sku: product.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: { "@type": "Offer", priceCurrency: "INR", price: (price / 100).toFixed(2), availability: product.variants.some((item) => item.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/products/${product.slug}` },
    aggregateRating: product.reviews.length ? { "@type": "AggregateRating", ratingValue: product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length, reviewCount: product.reviews.length } : undefined,
  };
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: process.env.NEXT_PUBLIC_APP_URL }, { "@type": "ListItem", position: 2, name: product.category?.name ?? "Products", item: `${process.env.NEXT_PUBLIC_APP_URL}/category/${product.category?.slug ?? ""}` }, { "@type": "ListItem", position: 3, name: product.name }] };
  const average = product.reviews.length ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length : null;
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} /><section className="product-detail"><div className="gallery"><div className="main-image">{product.images[0] ? <img src={product.images[0].url} alt={product.name} /> : "Product photo coming soon"}</div><div className="thumbs">{product.images.map((image) => <img key={image.id} src={image.url} alt={image.alt ?? product.name} />)}</div></div><div className="detail-copy"><p className="eyebrow">{product.condition.replace("_", " ")} · {product.brand?.name}</p><h1>{product.name}</h1><div className="rating">{average ? `${"★".repeat(Math.round(average))}${"☆".repeat(5 - Math.round(average))}` : "Not yet reviewed"} <span>{average ? `${average.toFixed(1)} from ${product.reviews.length} reviews` : ""}</span></div><div className="detail-price">{inr(price)} {product.basePrice > price && <del>{inr(product.basePrice)}</del>}</div><p className="tax-note">Inclusive of configured GST. Shipping is selected transparently at checkout.</p><p className="description">{product.description}</p><div className="specs"><span><b>Condition</b>{product.condition}{product.grade ? ` · ${product.grade}` : ""}</span><span><b>Warranty</b>{product.warrantyMonths} months</span><span><b>Availability</b>{product.variants.some((item) => item.stock > 0) ? "In stock" : "Sold out"}</span></div><AddToCart productId={product.id} variants={product.variants.map((variant) => ({ id: variant.id, title: variant.title, stock: variant.stock }))} /></div><section className="detail-bottom"><h2>Product specifications</h2><div>{product.specifications && Object.entries(product.specifications as Record<string, string>).map(([key, value]) => <p key={key}><b>{key}</b><span>{value}</span></p>)}</div><h2>What&apos;s included</h2><p>{product.whatsIncluded ?? "Product and the accessories listed in its variant/condition description."}</p><h2>Condition & warranty</h2><p>{brand.name} condition checks are documented before every listing. Sensitive device identifiers are never shown on this page.</p><h2>Delivery & returns</h2><p>Delivery estimates and charges are selected from the configured pincode/state rules at checkout. Return eligibility is governed by the current store return window.</p><h2>Customer reviews</h2>{product.reviews.length ? product.reviews.map((review) => <article className="customer-review" key={review.id}><b>{"★".repeat(review.rating)} · Verified purchase</b><p>{review.body}</p><small>{review.user.name}</small></article>) : <p>No published reviews yet.</p>}{canReview ? <ReviewForm productId={product.id} /> : <p className="review-note">Only customers who have bought and received this product can write a review.</p>}</section></section></>;
}
