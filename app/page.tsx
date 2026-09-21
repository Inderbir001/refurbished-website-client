import Link from "next/link";
import { HomepageSectionType } from "@prisma/client";
import { CopyCode } from "@/components/store/copy-code";
import { ProductCard } from "@/components/store/product-card";
import { db } from "@/lib/db";
import { pageData } from "@/lib/page-data";
import { listDeals, productCardInclude } from "@/lib/catalog";
import { custom, legacyTitles } from "@/lib/homepage";
import { dealOf, inr } from "@/lib/money";
import { CountUp } from "@/components/store/count-up";

export const dynamic = "force-dynamic";

type Deal = Awaited<ReturnType<typeof listDeals>>[number];
type Coupon = Awaited<ReturnType<typeof db.coupon.findMany>>[number];
const budgets = [999, 1999, 9999, 24999, 49999];
const shortDate = (date: Date) => date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function couponCopy(coupon: Coupon) {
  const value = coupon.type === "PERCENTAGE" ? `${coupon.value}% OFF` : `${inr(coupon.value)} OFF`;
  const details = [
    coupon.minimumOrder ? `on orders above ${inr(coupon.minimumOrder)}` : "on your order",
    coupon.type === "PERCENTAGE" && coupon.maximumDiscount ? `save up to ${inr(coupon.maximumDiscount)}` : null,
    coupon.scopeType !== "ORDER" ? "on selected products" : null,
    coupon.firstOrderOnly ? "first order only" : null,
    coupon.expiresAt ? `ends ${shortDate(coupon.expiresAt)}` : null,
  ].filter(Boolean);
  return { value, details: details.join(" · ") };
}

export default async function Home() {
  const now = new Date();
  const { store, sections, banners, deals, coupons, collections } = await pageData("home");

  const inStock = deals.filter((product) => product.variants.some((variant) => variant.stock > 0));
  const ranked = inStock.map((product) => ({ product, ...dealOf(product) })).sort((a, b) => b.percent - a.percent || b.saving - a.saving);
  const onOffer = ranked.filter((entry) => entry.percent > 0);
  const topDeals = onOffer.slice(0, 8).map((entry) => entry.product);
  const maxPercent = onOffer[0]?.percent ?? 0;
  const refurbished = onOffer.filter((entry) => entry.product.condition === "REFURBISHED");
  const refurbSavings = refurbished[0]?.percent ?? 0;
  const liveCoupons = coupons.filter((coupon) => coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit).slice(0, 4);

  const categoryStats = new Map<string, { name: string; slug: string; percent: number; from: number; count: number }>();
  const brandStats = new Map<string, { name: string; slug: string; percent: number; count: number }>();
  for (const { product, percent, price } of ranked) {
    if (product.category) {
      const row = categoryStats.get(product.category.id) ?? { name: product.category.name, slug: product.category.slug, percent: 0, from: price, count: 0 };
      row.percent = Math.max(row.percent, percent); row.from = Math.min(row.from, price); row.count += 1;
      categoryStats.set(product.category.id, row);
    }
    if (product.brand) {
      const row = brandStats.get(product.brand.id) ?? { name: product.brand.name, slug: product.brand.slug, percent: 0, count: 0 };
      row.percent = Math.max(row.percent, percent); row.count += 1;
      brandStats.set(product.brand.id, row);
    }
  }
  const categoryOffers = [...categoryStats.values()].sort((a, b) => b.percent - a.percent);
  const brandOffers = [...brandStats.values()].sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));
  const budgetTiles = budgets.map((limit) => ({ limit, count: ranked.filter((entry) => entry.price <= limit * 100).length })).filter((tile) => tile.count > 0);
  const spotlight = onOffer.slice(0, 2);
  const heroImage = banners[0]?.imageUrl;

  const defaults = [HomepageSectionType.HERO, HomepageSectionType.FEATURED_PRODUCTS, HomepageSectionType.CATEGORIES, HomepageSectionType.COLLECTION, HomepageSectionType.BRANDS, HomepageSectionType.TRUST];
  const visible = sections.length ? sections : defaults.map((type, position) => ({ id: type, type, title: null, subtitle: null, position }));

  return <div className="offers">{visible.map((section) => {
    if (section.type === HomepageSectionType.HERO) return <div key={section.id}>
      <section className="offer-hero">
        <div className="offer-main">
          {heroImage && <img className="offer-bg" src={heroImage} alt="" />}
          <span className="offer-tag"><i className="live-dot" />LIVE OFFERS</span>
          <h1>{custom(section.title, "") ? custom(section.title, "") : maxPercent > 0 ? <>Up to <em><CountUp value={maxPercent} suffix="% off" /></em></> : <>Great deals on <em>electronics</em></>}</h1>
          <p>{section.subtitle && !legacyTitles.has(section.subtitle) && section.subtitle.length < 160 ? section.subtitle : "Phones, audio, chargers and wearables — new, certified refurbished and pre-owned, all with warranty."}</p>
          <div className="offer-actions"><Link className="offer-cta" href="/products?sort=price-asc">Shop all deals</Link><Link className="offer-ghost" href="/products?condition=REFURBISHED">Refurbished{refurbSavings > 0 ? ` · save up to ${refurbSavings}%` : ""}</Link></div>
          <div className="offer-stats"><span><b><CountUp value={onOffer.length} /></b> products on offer</span><span><b>{store?.settings?.returnDays ?? 7} days</b> easy returns</span><span><b>Free delivery</b> over {inr(store?.settings?.freeShippingThreshold ?? 49900)}</span></div>
        </div>
        <div className="offer-side">{spotlight.map(({ product, percent, price, original }) => <Link key={product.id} href={`/products/${product.slug}`} className="offer-tile">{product.images[0] && <img src={product.images[0].url} alt="" />}<b className="offer-pct">{percent}% OFF</b><span><small>{product.brand?.name ?? "Top deal"}</small><strong>{product.name}</strong><i>{inr(price)} <del>{inr(original)}</del></i></span></Link>)}</div>
      </section>
      {liveCoupons.length > 0 && <div className="coupon-strip" data-reveal-group>{liveCoupons.map((coupon) => { const copy = couponCopy(coupon); return <article className="coupon" key={coupon.id}><div><strong>{copy.value}</strong><small>{copy.details}</small></div><CopyCode code={coupon.code} /></article>; })}</div>}
      {budgetTiles.length > 0 && <section className="offer-section"><div className="offer-head" data-reveal><div><p className="eyebrow">SHOP BY BUDGET</p><h2>Find something in your range</h2></div></div><div className="budget-row" data-reveal-group>{budgetTiles.map((tile) => <Link key={tile.limit} href={`/products?max=${tile.limit}&sort=price-asc`}><small>UNDER</small><strong>{inr(tile.limit * 100)}</strong><span>{tile.count} products →</span></Link>)}</div></section>}
    </div>;
    if (section.type === HomepageSectionType.FEATURED_PRODUCTS) return <div key={section.id}>
      <section className="offer-section"><div className="offer-head" data-reveal><div><p className="eyebrow">BIGGEST DISCOUNTS</p><h2>{custom(section.title, "Top deals right now")}</h2></div><Link className="text-link" href="/products?sort=price-asc">See all deals →</Link></div>{topDeals.length ? <div className="product-grid" data-reveal-group>{topDeals.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>New offers are on the way.</h3><p><Link className="text-link" href="/products">Browse the catalog</Link> in the meantime.</p></div>}</section>
      {refurbished.length > 0 && <section className="refurb-band"><div className="offer-head" data-reveal><div><p className="eyebrow">CERTIFIED REFURBISHED</p><h2>Same tech, {refurbSavings ? `up to ${refurbSavings}% ` : ""}less</h2></div><Link className="text-link" href="/products?condition=REFURBISHED">Shop refurbished →</Link></div><div className="product-grid" data-reveal-group>{refurbished.slice(0, 4).map(({ product }) => <ProductCard key={product.id} product={product} />)}</div></section>}
    </div>;
    if (section.type === HomepageSectionType.CATEGORIES) return categoryOffers.length ? <section className="offer-section" key={section.id}><div className="offer-head" data-reveal><div><p className="eyebrow">OFFERS BY CATEGORY</p><h2>{custom(section.title, "Pick a category, pick a saving")}</h2></div></div><div className="cat-offers" data-reveal-group>{categoryOffers.map((category) => <Link key={category.slug} href={`/category/${category.slug}`}><small>{category.percent > 0 ? "UP TO" : "STARTING"}</small><strong>{category.percent > 0 ? `${category.percent}% off` : inr(category.from)}</strong><span>{category.name}</span><em>from {inr(category.from)} · {category.count} {category.count === 1 ? "item" : "items"}</em></Link>)}</div></section> : null;
    if (section.type === HomepageSectionType.COLLECTION) return <div key={section.id}>{collections.filter((collection) => collection.products.length).slice(0, 2).map((collection) => <section className="offer-section" key={collection.id}><div className="offer-head" data-reveal><div><p className="eyebrow">CURATED OFFER</p><h2>{collection.name}</h2></div><Link className="text-link" href="/products">See all →</Link></div><div className="product-grid" data-reveal-group>{collection.products.map(({ product }) => <ProductCard key={product.id} product={product} />)}</div></section>)}</div>;
    if (section.type === HomepageSectionType.BRANDS) return brandOffers.length ? <section className="offer-section" key={section.id}><div className="offer-head" data-reveal><div><p className="eyebrow">BRAND OFFERS</p><h2>{custom(section.title, "Top brands, better prices")}</h2></div></div><div className="brand-offers" data-reveal-group>{brandOffers.map((brand) => <Link key={brand.slug} href={`/products?brand=${brand.slug}`}><b>{brand.name}</b><small>{brand.percent > 0 ? `up to ${brand.percent}% off` : `${brand.count} products`}</small></Link>)}</div></section> : null;
    if (section.type === HomepageSectionType.PROMO_BANNER) { const banner = banners[1]; return banner ? <Link className="promo-banner" href={banner.linkUrl ?? "/products"} key={section.id}><img src={banner.imageUrl} alt="" /><span><b>{banner.title}</b><small>{banner.subtitle}</small></span></Link> : null; }
    if (section.type === HomepageSectionType.TRUST) return <section className="offer-section" key={section.id}><div className="trust-strip" data-reveal-group><article><b>Up to 12 months warranty</b><p>Every device is tested; refurbished phones carry a 6-month warranty.</p></article><article><b>{store?.settings?.returnDays ?? 7}-day easy returns</b><p>Not what you expected? Start a return from your account.</p></article><article><b>Verified, secure payments</b><p>Orders are confirmed only after the payment gateway confirms your payment.</p></article></div></section>;
    return null;
  })}</div>;
}
