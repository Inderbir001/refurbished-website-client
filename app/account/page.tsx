import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/store/account-nav";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Account() { const session = await currentSession(); if (!session) redirect("/login"); const [user, orders, wishlist, addresses] = await Promise.all([db.user.findUniqueOrThrow({ where: { id: session.sub }, select: { name: true, email: true, createdAt: true } }), db.order.count({ where: { userId: session.sub } }), db.wishlistItem.count({ where: { userId: session.sub } }), db.address.count({ where: { userId: session.sub } })]); return <section className="page-shell"><AccountNav /><p className="eyebrow">MY ACCOUNT</p><h1>Welcome, {user.name}.</h1><p>{user.email}</p><div className="stat-grid"><article><span>Orders</span><b>{orders}</b><Link href="/account/orders">View orders</Link></article><article><span>Wishlist</span><b>{wishlist}</b><Link href="/account/wishlist">View wishlist</Link></article><article><span>Addresses</span><b>{addresses}</b><Link href="/account/addresses">Manage</Link></article></div></section>; }
