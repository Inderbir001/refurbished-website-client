import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/store/account-nav";
import { WishlistActions } from "@/components/store/wishlist-actions";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Wishlist() { const session = await currentSession(); if (!session) redirect("/login"); const items = await db.wishlistItem.findMany({ where: { userId: session.sub }, include: { product: { include: { images: { take: 1 }, variants: { where: { stock: { gt: 0 } }, take: 1 } } } } }); return <section className="page-shell"><AccountNav /><p className="eyebrow">SAVED PRODUCTS</p><h1>Wishlist</h1>{items.length ? <div className="account-list">{items.map((item) => <article key={item.id}><Link href={`/products/${item.product.slug}`}><b>{item.product.name}</b></Link><WishlistActions productId={item.productId} variantId={item.product.variants[0]?.id} /></article>)}</div> : <div className="empty-state"><h3>Your wishlist is empty</h3><Link href="/products" className="primary-button">Explore products</Link></div>}</section>; }
