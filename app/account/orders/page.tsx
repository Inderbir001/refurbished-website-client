import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/store/account-nav";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
export const dynamic = "force-dynamic";
export default async function Orders() { const session = await currentSession(); if (!session) redirect("/login"); const orders = await db.order.findMany({ where: { userId: session.sub }, orderBy: { createdAt: "desc" }, include: { items: true, shipment: true } }); return <section className="page-shell"><AccountNav /><p className="eyebrow">ORDER HISTORY</p><h1>Your orders</h1>{orders.length ? <div className="account-list">{orders.map((order) => <Link href={`/account/orders/${order.id}`} key={order.id}><b>{order.orderNumber}</b><span>{order.status.replaceAll("_", " ")}</span><span>{order.items.length} lines</span><strong>{inr(order.total)}</strong></Link>)}</div> : <div className="empty-state"><h3>No orders yet</h3><Link className="primary-button" href="/products">Start shopping</Link></div>}</section>; }
