import Link from "next/link";
import { HomepageSectionType } from "@prisma/client";
import { CopyCode } from "@/components/store/copy-code";
import { Icon } from "@/components/store/icons";
import { ProductCard } from "@/components/store/product-card";
import { db } from "@/lib/db";
import { pageData } from "@/lib/page-data";
import { listDeals } from "@/lib/catalog";
import { custom, legacyTitles } from "@/lib/homepage";
import { dealOf, inr } from "@/lib/money";

export const dynamic = "force-dynamic";

type Coupon = Awaited<ReturnType<typeof db.coupon.findMany>>[number];
type Ranked = ReturnType<typeof rankDeals>;
const budgets = [999, 1999, 9999, 24999, 49999];
const shortDate = (date: Date) => date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
// Items priced under ₹100 are test or placeholder listings: they never headline the homepage.
const REAL_PRICE = 10_000;

function rankDeals(deals: Awaited<ReturnType<typeof listDeals>>) {
  return deals
    .filter((product) => product.variants.some((variant) => variant.stock > 0))
    .map((product) => ({ product, ...dealOf(product) }))
    .sort((a, b) => b.percent - a.percent || b.saving - a.saving);
}

function couponCopy(coupon: Coupon) {
  const value = coupon.type === "PERCENTAGE" ? `${coupon.value}% off` : `${inr(coupon.value)} off`;
  const details = [
    coupon.minimumOrder ? `on orders above ${inr(coupon.minimumOrder)}` : "on your order",
    coupon.type === "PERCENTAGE" && coupon.maximumDiscount ? `up to ${inr(coupon.maximumDiscount)}` : null,
    coupon.scopeType !== "ORDER" ? "selected products" : null,
    coupon.firstOrderOnly ? "first order only" : null,
    coupon.expiresAt ? `ends ${shortDate(coupon.expiresAt)}` : null,
  ].filter(Boolean);
  return { value, details: details.join(" · ") };
}

export default async function Home() {
  const { store, sections, banners, deals, coupons, collections } = await pageData("home");
  const returnDays = store?.settings?.returnDays ?? 7;
  const freeFrom = store?.settings?.freeShippingThreshold ?? 49900;

  const ranked: Ranked = rankDeals(deals);
  const real = ranked.filter((entry) => entry.price >= REAL_PRICE);
  const onOffer = real.filter((entry) => entry.percent > 0);
  const topDeals = onOffer.slice(0, 10).map((entry) => entry.product);
  const refurbished = onOffer.filter((entry) => entry.product.condition === "REFURBISHED");
  const refurbSavings = refurbished[0]?.percent ?? 0;
  const maxPercent = onOffer[0]?.percent ?? 0;
  const liveCoupons = coupons.filter((coupon) => coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit).slice(0, 4);

  const categoryStats = new Map<string, { name: string; slug: string; from: number; count: number; image: string | null; percent: number }>();
  const brandStats = new Map<string, { name: string; slug: string; count: number }>();
  for (const { product, price, percent } of real) {
    if (product.category) {
      const row = categoryStats.get(product.category.id) ?? { name: product.category.name, slug: product.category.slug, from: price, count: 0, image: null, percent: 0 };
      row.from = Math.min(row.from, price); row.count += 1; row.percent = Math.max(row.percent, percent);
      if (!row.image && product.images[0]) row.image = product.images[0].url;
      categoryStats.set(product.category.id, row);
    }
    if (product.brand) {
      const row = brandStats.get(product.brand.id) ?? { name: product.brand.name, slug: product.brand.slug, count: 0 };
      row.count += 1; brandStats.set(product.brand.id, row);
    }
  }
  const categories = [...categoryStats.values()].sort((a, b) => b.count - a.count);
  const brandList = [...brandStats.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const budgetTiles = budgets.map((limit) => ({ limit, count: real.filter((entry) => entry.price <= limit * 100).length })).filter((tile) => tile.count > 0);
  const spotlight = (onOffer.length >= 2 ? onOffer : real).slice(0, 2);

  const defaults = [HomepageSectionType.HERO, HomepageSectionType.CATEGORIES, HomepageSectionType.FEATURED_PRODUCTS, HomepageSectionType.COLLECTION, HomepageSectionType.BRANDS, HomepageSectionType.TRUST];
  const visible = sections.length ? sections : defaults.map((type, position) => ({ id: type, type, title: null, subtitle: null, position }));
  const points: [string, string][] = [["shield", "Warranty on every device"], ["return", `${returnDays}-day easy returns`], ["truck", `Free delivery over ${inr(freeFrom)}`]];

  return <div className="home">{visible.map((section) => {
    if (section.type === HomepageSectionType.HERO) return <div key={section.id}>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-pill"><Icon name="check" size={15} /> New, certified refurbished &amp; pre-owned</span>
          <h1>{custom(section.title, "") || "Quality electronics at honest prices."}</h1>
          <p>{section.subtitle && !legacyTitles.has(section.subtitle) && section.subtitle.length < 160 ? section.subtitle : "Phones, earbuds, chargers and more. Every device is checked and graded before it ships, and comes with warranty."}</p>
          <div className="hero-actions">
            <Link className="btn-solid" href="/products?sort=price-asc">Shop all deals</Link>
            <Link className="btn-line" href="/products?condition=REFURBISHED">Refurbished phones{refurbSavings > 0 ? ` · save up to ${refurbSavings}%` : ""}</Link>
          </div>
          <ul className="hero-points">{points.map(([icon, text]) => <li key={text}><Icon name={icon} size={18} />{text}</li>)}</ul>
        </div>
        <div className="hero-visual">
          <span className="hero-blob" aria-hidden="true" />
          {spotlight.map(({ product, percent, price, original }, index) => <Link key={product.id} href={`/products/${product.slug}`} className={`hero-card c${index + 1}`}>
            <span className="hero-img">{product.images[0] && <img src={product.images[0].url} alt={product.name} />}</span>
            {percent > 0 && <b className="hero-off">{percent}% off</b>}
            <span className="hero-info"><small>{product.brand?.name ?? "Top deal"}</small><strong>{product.name}</strong><i>{inr(price)}{original > price && <del>{inr(original)}</del>}</i></span>
          </Link>)}
          {maxPercent > 0 && <span className="hero-badge"><b>Up to {maxPercent}%</b> off today</span>}
        </div>
      </section>
      <section className="trust-bar"><div>{[["truck", "Free delivery", `On orders over ${inr(freeFrom)}`], ["return", `${returnDays}-day returns`, "Simple and hassle free"], ["shield", "Warranty included", "On every device we sell"], ["lock", "Secure payments", "UPI, cards and net banking"]].map(([icon, title, note]) => <article key={title}><span><Icon name={icon} /></span><div><b>{title}</b><small>{note}</small></div></article>)}</div></section>
      {liveCoupons.length > 0 && <section className="home-section"><div className="coupon-strip">{liveCoupons.map((coupon) => { const copy = couponCopy(coupon); return <article className="coupon" key={coupon.id}><span className="coupon-icon"><Icon name="tag" size={20} /></span><div><strong>{copy.value}</strong><small>{copy.details}</small></div><CopyCode code={coupon.code} /></article>; })}</div></section>}
    </div>;

    if (section.type === HomepageSectionType.FEATURED_PRODUCTS) return <div key={section.id}>
      <section className="home-section"><div className="home-head"><div><h2>{custom(section.title, "Top deals right now")}</h2><p>The biggest savings on devices that are in stock today.</p></div><Link className="see-all" href="/products?sort=price-asc">See all deals →</Link></div>{topDeals.length ? <div className="product-grid">{topDeals.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>New offers are on the way.</h3><p><Link className="text-link" href="/products">Browse the catalog</Link> in the meantime.</p></div>}</section>
      {refurbished.length > 0 && <section className="refurb-band"><div className="refurb-inner"><div className="refurb-intro"><span className="band-tag">Certified refurbished</span><h2>Same tech, {refurbSavings ? `up to ${refurbSavings}% ` : ""}less</h2><p>Every phone is tested, graded and backed by warranty. A smarter way to get a better phone.</p><ul><li><Icon name="check" size={16} /> Tested and graded before it ships</li><li><Icon name="check" size={16} /> Warranty included</li><li><Icon name="check" size={16} /> {returnDays}-day easy returns</li></ul><Link className="btn-solid" href="/products?condition=REFURBISHED">Shop refurbished</Link></div><div className="product-grid">{refurbished.slice(0, 4).map(({ product }) => <ProductCard key={product.id} product={product} />)}</div></div></section>}
    </div>;

    if (section.type === HomepageSectionType.CATEGORIES) return categories.length ? <section className="home-section" key={section.id}><div className="home-head"><div><h2>{custom(section.title, "Shop by category")}</h2><p>Find what you need, fast.</p></div><Link className="see-all" href="/products">View all products →</Link></div><div className="cat-grid">{categories.map((category) => <Link key={category.slug} href={`/category/${category.slug}`}><span className="cat-img">{category.image ? <img src={category.image} alt="" loading="lazy" /> : <Icon name="chip" size={34} />}</span><b>{category.name}</b><small>{category.count} {category.count === 1 ? "product" : "products"} · from {inr(category.from)}</small></Link>)}</div></section> : null;

    if (section.type === HomepageSectionType.COLLECTION) return <div key={section.id}>{collections.filter((collection) => collection.products.length).slice(0, 2).map((collection) => <section className="home-section" key={collection.id}><div className="home-head"><div><h2>{collection.name}</h2><p>Hand-picked for you.</p></div><Link className="see-all" href="/products">See all →</Link></div><div className="product-grid">{collection.products.map(({ product }) => <ProductCard key={product.id} product={product} />)}</div></section>)}</div>;

    if (section.type === HomepageSectionType.BRANDS) return <div key={section.id}>
      {brandList.length > 0 && <section className="home-section"><div className="home-head"><div><h2>{custom(section.title, "Shop by brand")}</h2></div></div><div className="brand-chips">{brandList.map((brand) => <Link key={brand.slug} href={`/products?brand=${brand.slug}`}>{brand.name}<small>{brand.count}</small></Link>)}</div></section>}
      {budgetTiles.length > 0 && <section className="home-section"><div className="home-head"><div><h2>Shop by budget</h2></div></div><div className="budget-chips">{budgetTiles.map((tile) => <Link key={tile.limit} href={`/products?max=${tile.limit}&sort=price-asc`}><small>Under</small><b>{inr(tile.limit * 100)}</b><span>{tile.count} products →</span></Link>)}</div></section>}
    </div>;

    if (section.type === HomepageSectionType.PROMO_BANNER) { const banner = banners[1]; return banner ? <Link className="promo-banner" href={banner.linkUrl ?? "/products"} key={section.id}><img src={banner.imageUrl} alt="" /><span><b>{banner.title}</b><small>{banner.subtitle}</small></span></Link> : null; }

    if (section.type === HomepageSectionType.TRUST) return <section className="home-section" key={section.id}><div className="why"><div className="home-head"><div><h2>Why shop with Mobile &amp; More</h2></div></div><div className="why-grid"><article><span><Icon name="shield" /></span><b>Tested and covered</b><p>Every device is checked before it ships. Refurbished phones carry a 6-month warranty.</p></article><article><span><Icon name="return" /></span><b>{returnDays}-day easy returns</b><p>Not what you expected? Start a return from your account in a couple of taps.</p></article><article><span><Icon name="lock" /></span><b>Safe, verified payments</b><p>Pay with UPI, cards or net banking. Orders are confirmed only after your payment is verified.</p></article></div></div></section>;
    return null;
  })}</div>;
}
