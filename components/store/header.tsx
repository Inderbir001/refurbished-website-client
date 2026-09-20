import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItemCount } from "@/lib/services/cart-service";
import { CartBadge } from "@/components/store/cart-badge";
import { CategoryMenu } from "@/components/store/category-menu";
import { CategoryStrip } from "@/components/store/category-strip";
import { getAnnouncement } from "@/lib/site-content";
import { SearchBox } from "@/components/store/search-box";
import { brand } from "@/lib/brand";
import { Wordmark } from "@/components/store/wordmark";

async function headerCartCount(userId?: string) {
  try { return await cartItemCount(userId ? { userId } : { sessionToken: (await cookies()).get("guest_cart")?.value }); } catch { return 0; }
}

async function menuCategories() {
  try {
    const select = { id: true, name: true, slug: true, _count: { select: { products: true } } } as const;
    const orderBy = [{ position: "asc" as const }, { name: "asc" as const }];
    let rows = await db.category.findMany({ where: { isVisible: true, parentId: { not: null } }, select, orderBy });
    if (!rows.length) rows = await db.category.findMany({ where: { isVisible: true }, select, orderBy });
    return rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug, count: row._count.products }));
  } catch { return []; }
}

const icon = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export async function Header() {
  const session = await currentSession();
  const staff = session ? ["SUPER_ADMIN", "ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER"].includes(session.role) : false;
  const [count, categories, announcement] = await Promise.all([headerCartCount(session?.sub), menuCategories(), getAnnouncement()]);
  // Repeat short lists so the sliding strip always fills the screen; two identical copies make the loop seamless.
  const reps = Math.max(1, Math.ceil(8 / announcement.messages.length));
  const track = Array.from({ length: reps }, () => announcement.messages).flat();
  return <>
    {announcement.enabled && <div className="announcement" aria-label="Store highlights"><div className="ticker-track">{[0, 1].map((copy) => <ul key={copy} aria-hidden={copy === 1}>{track.map((text, index) => <li key={index}>{text}</li>)}</ul>)}</div></div>}
    <header className="site-header">
      <div className="sh-main">
        <Link href="/" className="wordmark sh-logo"><Wordmark /></Link>
        <div className="sh-search">
          <Suspense fallback={<div className="search-box header-search" />}><SearchBox variant="header" /></Suspense>
          <Link href="/products" className="sh-shopall"><svg {...icon} width={18} height={18}><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></svg><span>Shop all</span></Link>
        </div>
        <div className="sh-actions">
          <Link href="/" className="sh-action"><svg {...icon}><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></svg><span>Home</span></Link>
          {staff && <Link href="/admin" className="sh-action sh-admin"><svg {...icon}><rect x="4" y="4" width="7" height="9" rx="1.5" /><rect x="13" y="4" width="7" height="5" rx="1.5" /><rect x="13" y="12" width="7" height="8" rx="1.5" /><rect x="4" y="16" width="7" height="4" rx="1.5" /></svg><span>Admin</span></Link>}<Link href={session ? "/account" : "/login"} className="sh-action"><svg {...icon}><circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></svg><span>{session ? "Account" : "Sign in"}</span></Link>
          {session && <Link href="/account/wishlist" className="sh-action sh-wishlist"><svg {...icon}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg><span>Wishlist</span></Link>}
          <Link href="/cart" className="sh-action"><span className="sh-cart-icon"><svg {...icon}><path d="M3 4h2l2.4 11h10.4L20 8H6.2" /><circle cx="9" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></svg><CartBadge initial={count} /></span><span>Cart</span></Link>
        </div>
      </div>
      <div className="sh-cats" role="navigation" aria-label="Categories">
        <CategoryMenu categories={categories} />
        <Suspense fallback={<div className="cat-scroll" />}><CategoryStrip categories={categories} /></Suspense>
      </div>
    </header>
  </>;
}
