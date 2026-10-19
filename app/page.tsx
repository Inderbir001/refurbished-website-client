import Link from "next/link";
import { Pic } from "@/components/store/pic";
import { HomepageSectionType } from "@prisma/client";
import { CopyCode } from "@/components/store/copy-code";
import { Icon } from "@/components/store/icons";
import { HomeSlider } from "@/components/store/home-slider";
import { ProductCard } from "@/components/store/product-card";
import { ScrollRow } from "@/components/store/scroll-row";
import { db } from "@/lib/db";
import { pageData } from "@/lib/page-data";
import { listDeals } from "@/lib/catalog";
import { custom } from "@/lib/homepage";
import { dealOf, inr } from "@/lib/money";

export const dynamic = "force-dynamic";

type Coupon = Awaited<ReturnType<typeof db.coupon.findMany>>[number];
type Deals = Awaited<ReturnType<typeof listDeals>>;
type Ranked = ReturnType<typeof rankDeals>;
type Product = Deals[number];
const budgets = [999, 1999, 9999, 24999, 49999];
const tints = ["#ffe6d8", "#dff3e8", "#ebe5fb", "#dcedfb", "#fff0c7", "#fde1e7"];
const shortDate = (date: Date) => date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
// Items priced under ₹100 are test or placeholder listings: they never headline the homepage.
const REAL_PRICE = 10_000;

function rankDeals(deals: Deals) {
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

const photo = (product?: Product) => product?.images[0]?.url ?? null;

function Head({ title, note, href, cta = "See all", icon }: { title: string; note?: string; href?: string; cta?: string; icon?: string }) {
  return <div className="home-head">
    <div><h2>{icon && <span className="head-icon"><Icon name={icon} size={20} /></span>}{title}</h2>{note && <p>{note}</p>}</div>
    {href && <Link className="see-all" href={href}>{cta} <Icon name="arrow" size={15} /></Link>}
  </div>;
}

function Row({ products, eager = false }: { products: Product[]; eager?: boolean }) {
  return <ScrollRow className="prow">{products.map((product, index) => <div className="prow-item" key={product.id}><ProductCard product={product} eager={eager && index < 3} /></div>)}</ScrollRow>;
}

export default async function Home() {
  const { store, sections, banners, deals, coupons, collections, bestIds, soldIds } = await pageData("home");
  const settings = store?.settings;
  const returnDays = settings?.returnDays ?? 7;
  const freeFrom = settings?.freeShippingThreshold ?? 49900;
  const cancelHours = settings?.cancellationHours ?? 24;

  // The owner can hide parts of the page in Admin → Homepage; the order here is fixed.
  const shown = (type: HomepageSectionType) => !sections.length || sections.some((section) => section.type === type);
  const titleOf = (type: HomepageSectionType, fallback: string) => custom(sections.find((section) => section.type === type)?.title, fallback);

  const ranked: Ranked = rankDeals(deals);
  const real = ranked.filter((entry) => entry.price >= REAL_PRICE);
  const onOffer = real.filter((entry) => entry.percent > 0);
  const byId = new Map(real.map((entry) => [entry.product.id, entry.product]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));

  // Best sellers: the owner's "best-sellers" collection if there is one, otherwise what customers have really paid for.
  // With too little real history we say "Top picks" instead of pretending.
  const curated = pick(bestIds ?? []);
  const sold = pick(soldIds ?? []);
  const bestSellers = curated.length ? curated : sold.length >= 3 ? sold : [];
  const topPicks = [...real].sort((a, b) => b.product.reviews.length - a.product.reviews.length || b.percent - a.percent).slice(0, 12).map((entry) => entry.product);
  const firstRow = bestSellers.length ? bestSellers.slice(0, 12) : topPicks;
  const firstIds = new Set(firstRow.map((product) => product.id));

  const dealPool = onOffer.map((entry) => entry.product);
  const freshDeals = dealPool.filter((product) => !firstIds.has(product.id));
  const megaDeals = (freshDeals.length >= 4 ? freshDeals : dealPool).slice(0, 12);
  const refurbished = real.filter((entry) => entry.product.condition === "REFURBISHED").map((entry) => entry.product).slice(0, 12);
  const refurbSavings = onOffer.find((entry) => entry.product.condition === "REFURBISHED")?.percent ?? 0;
  const maxPercent = onOffer[0]?.percent ?? 0;
  const latest = [...real].sort((a, b) => new Date(b.product.createdAt).getTime() - new Date(a.product.createdAt).getTime()).slice(0, 12).map((entry) => entry.product);
  const liveCoupons = coupons.filter((coupon) => coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit).slice(0, 4);

  const categoryStats = new Map<string, { name: string; slug: string; from: number; count: number; image: string | null }>();
  const brandStats = new Map<string, { name: string; slug: string; count: number; logo: string | null }>();
  for (const { product, price } of real) {
    if (product.category) {
      const row = categoryStats.get(product.category.id) ?? { name: product.category.name, slug: product.category.slug, from: price, count: 0, image: null };
      row.from = Math.min(row.from, price); row.count += 1;
      if (!row.image && product.images[0]) row.image = product.images[0].url;
      categoryStats.set(product.category.id, row);
    }
    if (product.brand && !/^(unbranded|generic|no brand)$/i.test(product.brand.name.trim())) {
      const row = brandStats.get(product.brand.id) ?? { name: product.brand.name, slug: product.brand.slug, count: 0, logo: product.brand.logoUrl ?? null };
      row.count += 1; brandStats.set(product.brand.id, row);
    }
  }
  // Phones are the big-ticket items, so their category always comes first.
  const isPhoneName = (name: string) => /^(mobile phones?|smartphones?|phones?)$/i.test(name.trim());
  const categories = [...categoryStats.values()].sort((a, b) => Number(isPhoneName(b.name)) - Number(isPhoneName(a.name)) || b.count - a.count);
  const otherCategories = categories.filter((category) => !isPhoneName(category.name));
  const phoneCategory = categories.find((category) => isPhoneName(category.name));
  const phoneEntries = real.filter((entry) => entry.product.category && isPhoneName(entry.product.category.name));
  const phones = phoneEntries.map((entry) => entry.product).slice(0, 12);
  const phoneFrom = phoneEntries.length ? Math.min(...phoneEntries.map((entry) => entry.price)) : 0;
  const phoneBrands = [...new Map(phoneEntries.filter((entry) => entry.product.brand).map((entry) => [entry.product.brand!.slug, entry.product.brand!.name] as const)).entries()].slice(0, 8);
  const brandList = [...brandStats.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const budgetTiles = budgets.map((limit) => ({ limit, count: real.filter((entry) => entry.price <= limit * 100).length })).filter((tile) => tile.count > 0);

  // Editorial tiles: each one is a real shortcut with a real product photo.
  const budgetTile = budgetTiles.find((tile) => tile.count >= 4) ?? budgetTiles[0];
  const budgetPhoto = budgetTile ? photo([...real].filter((entry) => entry.price <= budgetTile.limit * 100 && entry.product.images[0]).sort((a, b) => b.percent - a.percent)[0]?.product) : null;
  const topBrand = brandList[0];
  const brandPhoto = topBrand ? photo(real.find((entry) => entry.product.brand?.slug === topBrand.slug && entry.product.images[0])?.product) : null;
  const tiles = [
    phones.length && phoneCategory ? { key: "phones", className: "t-phone", tag: "Smartphones", title: `Phones from ${inr(phoneFrom)}`, note: `${phoneEntries.length} models in stock`, href: `/category/${phoneCategory.slug}`, image: photo(phones[0]) } : null,
    budgetTile ? { key: "budget", className: "t-budget", tag: "Shop by budget", title: `Under ${inr(budgetTile.limit * 100)}`, note: `${budgetTile.count} products`, href: `/products?max=${budgetTile.limit}&sort=price-asc`, image: budgetPhoto } : null,
    otherCategories[0] ? { key: "cat", className: "t-cat", tag: "Popular", title: otherCategories[0].name, note: `From ${inr(otherCategories[0].from)}`, href: `/category/${otherCategories[0].slug}`, image: otherCategories[0].image } : null,
    otherCategories[1] ? { key: "cat2", className: "t-cat2", tag: "Trending", title: otherCategories[1].name, note: `From ${inr(otherCategories[1].from)}`, href: `/category/${otherCategories[1].slug}`, image: otherCategories[1].image } : null,
    topBrand ? { key: "brand", className: "t-brand", tag: "Top brand", title: topBrand.name, note: `${topBrand.count} products`, href: `/products?brand=${topBrand.slug}`, image: brandPhoto } : null,
  ].filter((tile): tile is NonNullable<typeof tile> => Boolean(tile)).slice(0, 4);

  const slides = banners.filter((banner) => banner.imageUrl).map((banner) => ({ id: banner.id, title: banner.title, href: banner.linkUrl, image: banner.imageUrl, mobile: banner.mobileImageUrl }));
  // A collection with only one or two products looks empty on the homepage, so it appears once it has at least three.
  const collectionRows = collections.filter((collection) => collection.slug !== "best-sellers" && collection.products.length >= 3).slice(0, 2);
  const phone = settings?.supportPhone?.trim();
  const email = settings?.supportEmail?.trim();
  const faqs: [string, string][] = [
    ["Are refurbished devices really tested?", "Yes. Every refurbished device is checked and graded before it ships, and it comes with a warranty."],
    ["How long do I have to return something?", `You have ${returnDays} days after delivery. Start a return from your account in a couple of taps.`],
    ["Is delivery free?", `Orders above ${inr(freeFrom)} ship free. For smaller orders the delivery charge is shown at checkout before you pay.`],
    ["How can I pay?", "UPI, cards, net banking and wallets, all inside a secure Razorpay window. Your order is confirmed once the payment is verified."],
    ["Can I cancel an order?", `Yes, free of charge within ${cancelHours} hours of ordering, from the order page in your account.`],
  ];

  return <div className="home">
    <h1 className="sr-only">{titleOf(HomepageSectionType.HERO, "Mobile & More: new and certified refurbished electronics")}</h1>

    {shown(HomepageSectionType.HERO) && <>
      {slides.length > 0
        ? <div className="slider-wrap"><HomeSlider slides={slides} /></div>
        : <section className="hero-lite"><div><span className="band-tag">New, certified refurbished &amp; pre-owned</span><p className="hero-lite-title">Quality electronics at honest prices</p><p>Every device is checked and graded before it ships, and comes with warranty.</p><div className="hero-lite-actions"><Link className="btn-solid" href="/products?sort=price-asc">Shop all deals</Link><Link className="btn-line" href="/products?condition=REFURBISHED">Refurbished{refurbSavings > 0 ? ` · save up to ${refurbSavings}%` : ""}</Link></div></div></section>}
      <section className="home-trust" aria-label="Why shop with us"><div>
        {[["truck", "Free delivery", `On orders over ${inr(freeFrom)}`], ["return", `${returnDays}-day returns`, "Simple and hassle free"], ["shield", "Warranty included", "On every device we sell"], ["lock", "Secure payments", "UPI, cards, net banking"]].map(([icon, title, note]) => <article key={title}><span><Icon name={icon} size={22} /></span><div><b>{title}</b><small>{note}</small></div></article>)}
      </div></section>
    </>}

    {shown(HomepageSectionType.BRANDS) && brandList.length > 0 && <section className="brand-marquee" aria-label="Brands we stock" style={{ "--dur": `${Math.max(28, brandList.length * 3)}s` } as React.CSSProperties}>
      <div className="bm-track">{[0, 1].map((copy) => <ul key={copy} aria-hidden={copy === 1 ? true : undefined}>{brandList.map((brand) => <li key={brand.slug}><Link href={`/products?brand=${brand.slug}`} tabIndex={copy === 1 ? -1 : undefined} title={brand.name}>{brand.logo ? <Pic src={brand.logo} size={480} alt={copy === 1 ? "" : brand.name} /> : <span>{brand.name}</span>}</Link></li>)}</ul>)}</div>
    </section>}

    {shown(HomepageSectionType.FEATURED_PRODUCTS) && firstRow.length > 0 && <section className="home-section">
      <Head icon={bestSellers.length ? "flame" : "sparkle"} title={bestSellers.length ? titleOf(HomepageSectionType.FEATURED_PRODUCTS, "Best sellers") : "Top picks"} note={bestSellers.length ? "What our customers are buying most." : "Our favourite finds in stock right now."} href="/products?sort=popular" cta="View all" />
      <Row products={firstRow} eager />
    </section>}

    {shown(HomepageSectionType.CATEGORIES) && categories.length > 0 && <section className="home-section">
      <Head title={titleOf(HomepageSectionType.CATEGORIES, "Shop by category")} note="Find what you need, fast." href="/products" cta="All products" />
      <ScrollRow className="crow">{categories.map((category, index) => <Link className="cbub" key={category.slug} href={`/category/${category.slug}`} style={{ "--tint": tints[index % tints.length] } as React.CSSProperties}>
        <span className="cbub-img">{category.image ? <Pic src={category.image} size={480} /> : <Icon name="chip" size={34} />}</span>
        <b>{category.name}</b><small>from {inr(category.from)}</small>
      </Link>)}</ScrollRow>
    </section>}

    {shown(HomepageSectionType.FEATURED_PRODUCTS) && <>
      {phones.length > 0 && phoneCategory && <section className="home-section"><div className="panel panel-sky">
        <div className="panel-head"><div><span className="panel-tag"><Icon name="phone" size={14} /> Smartphones</span><h2>Phones from {inr(phoneFrom)}</h2><p>New and certified refurbished smartphones, all in stock now.</p>
          {phoneBrands.length > 1 && <div className="chip-row">{phoneBrands.map(([slug, name]) => <Link key={slug} href={`/products?category=${phoneCategory.slug}&brand=${slug}`}>{name}</Link>)}</div>}</div>
          <Link className="panel-btn" href={`/category/${phoneCategory.slug}`}>Shop all phones <Icon name="arrow" size={15} /></Link></div>
        <Row products={phones} />
      </div></section>}

      {liveCoupons.length > 0 && <section className="home-section"><Head icon="tag" title="Offers you can use today" note="Copy a code and apply it at checkout." /><div className="coupon-strip">{liveCoupons.map((coupon) => { const copy = couponCopy(coupon); return <article className="coupon" key={coupon.id}><span className="coupon-icon"><Icon name="tag" size={20} /></span><div><strong>{copy.value}</strong><small>{copy.details}</small></div><CopyCode code={coupon.code} /></article>; })}</div></section>}

      {megaDeals.length > 0 && <section className="home-section"><div className="panel panel-peach">
        <div className="panel-head"><div><span className="panel-tag"><Icon name="bolt" size={14} /> Mega deals</span><h2>{maxPercent > 0 ? `Up to ${maxPercent}% off` : "Today's best prices"}</h2><p>The biggest savings on devices that are in stock right now.</p></div><Link className="panel-btn" href="/products?sort=price-asc">Shop all deals <Icon name="arrow" size={15} /></Link></div>
        <Row products={megaDeals} />
      </div></section>}

      {tiles.length > 0 && <section className="home-section"><div className={`tiles n${tiles.length}`}>{tiles.map((tile) => <Link key={tile.key} href={tile.href} className={`tile ${tile.className}`}>
        <div className="tile-copy"><small>{tile.tag}</small><b>{tile.title}</b>{"note" in tile && tile.note && <span>{tile.note}</span>}<i>Shop now <Icon name="arrow" size={14} /></i></div>
        {tile.image && <span className="tile-img"><Pic src={tile.image} size={480} /></span>}
      </Link>)}</div></section>}

      {refurbished.length > 0 && <section className="home-section"><div className="panel panel-green">
        <div className="panel-head"><div><span className="panel-tag"><Icon name="shield" size={14} /> Certified refurbished</span><h2>{refurbSavings ? `Same tech, up to ${refurbSavings}% less` : "Same tech, smarter price"}</h2><p>Tested and graded before it ships, with warranty and {returnDays}-day returns.</p></div><Link className="panel-btn" href="/products?condition=REFURBISHED">Shop refurbished <Icon name="arrow" size={15} /></Link></div>
        {refurbished.length < 5
          ? <div className="panel-body"><Row products={refurbished} /><div className="panel-facts">
            {refurbSavings > 0 && <div className="fact big"><b>Up to {refurbSavings}% off</b><span>the original price on certified refurbished devices</span></div>}
            <div className="fact"><i><Icon name="shield" size={22} /></i><b>Tested before it ships</b><span>Every device is checked and graded by us before it leaves.</span></div>
            <div className="fact"><i><Icon name="star" size={22} /></i><b>Honest condition grades</b><span>The grade is shown on every product page, so there are no surprises.</span></div>
            <div className="fact"><i><Icon name="check" size={22} /></i><b>Warranty included</b><span>Certified refurbished devices come with warranty.</span></div>
            <div className="fact"><i><Icon name="return" size={22} /></i><b>{returnDays}-day easy returns</b><span>Not happy? Start a return from your account in a few taps.</span></div>
          </div></div>
          : <Row products={refurbished} />}
      </div></section>}

      {latest.length > 0 && <section className="home-section"><Head icon="sparkle" title="Just landed" note="The newest additions to the store." href="/products" cta="Browse all" /><Row products={latest} /></section>}
    </>}

    {shown(HomepageSectionType.COLLECTION) && collectionRows.map((collection) => <section className="home-section" key={collection.id}>
      <Head title={collection.name} note="Hand-picked for you." href="/products" />
      <Row products={collection.products.map(({ product }) => product)} />
    </section>)}

    {shown(HomepageSectionType.BRANDS) && <>
      {brandList.length > 0 && <section className="home-section"><Head title={titleOf(HomepageSectionType.BRANDS, "Shop by brand")} note="Pick a brand you trust." href="/products" cta="All products" /><ScrollRow className="brow">{brandList.map((brand) => <Link className="btile" key={brand.slug} href={`/products?brand=${brand.slug}`}><span className="btile-logo">{brand.logo ? <Pic src={brand.logo} size={480} alt={brand.name} /> : <b>{brand.name}</b>}</span>{brand.logo && <b>{brand.name}</b>}<small>{brand.count} {brand.count === 1 ? "product" : "products"}</small></Link>)}</ScrollRow></section>}
      {budgetTiles.length > 0 && <section className="home-section"><Head title="Shop by budget" /><div className="budget-chips">{budgetTiles.map((tile, index) => <Link key={tile.limit} href={`/products?max=${tile.limit}&sort=price-asc`} style={{ "--tint": tints[index % tints.length] } as React.CSSProperties}><small>Under</small><b>{inr(tile.limit * 100)}</b><span>{tile.count} products <Icon name="arrow" size={13} /></span></Link>)}</div></section>}
    </>}

    {shown(HomepageSectionType.TRUST) && <section className="home-section why2">
      <div className="why2-head"><span className="why2-tag">Shop with confidence</span><h2>Why shop with Mobile &amp; More</h2><p>Everything you need to buy the right device, without the guesswork.</p></div>
      <div className="why2-cards">
        {[["shield", "Tested and covered", "Every device is checked before it ships. Refurbished phones carry a 6-month warranty.", "#ffe6d8"],
          ["return", `${returnDays}-day easy returns`, "Not what you expected? Start a return from your account in a couple of taps.", "#dff3e8"],
          ["lock", "Safe, verified payments", "Pay by UPI, card or net banking. Orders are confirmed only after your payment is verified.", "#ebe5fb"],
          ["truck", "Free delivery", `Orders above ${inr(freeFrom)} ship free. Smaller orders show the delivery charge before you pay.`, "#dcedfb"]].map(([icon, title, text, tint]) => <article key={title} style={{ "--tint": tint } as React.CSSProperties}><span><Icon name={icon} size={26} /></span><b>{title}</b><p>{text}</p></article>)}
      </div>
      <div className="why2-grid">
        <div className="faq"><h3>Quick answers</h3>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        <aside className="help2">
          <span className="help2-icon"><Icon name="sparkle" size={22} /></span>
          <h3>Need a hand choosing?</h3>
          <p>Tell us what you are looking for and we will point you to the right device.</p>
          <div className="help2-actions">
            {phone && <a className="btn-solid" href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Icon name="phone" size={17} /> {phone}</a>}
            {email && <a className="btn-line" href={`mailto:${email}`}><Icon name="mail" size={17} /> {email}</a>}
            {!phone && !email && <Link className="btn-solid" href="/contact">Contact us</Link>}
          </div>
        </aside>
      </div>
    </section>}
  </div>;
}
