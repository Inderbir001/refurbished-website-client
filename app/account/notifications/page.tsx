import { redirect } from "next/navigation";
import { AccountNav } from "@/components/store/account-nav";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function NotificationsPage() { const session = await currentSession(); if (!session) redirect("/login"); const rows = await db.notification.findMany({ where: { userId: session.sub, channel: "IN_APP" }, orderBy: { createdAt: "desc" }, take: 50 }); return <section className="page-shell"><AccountNav/><p className="eyebrow">UPDATES</p><h1>Notifications</h1><div className="account-list">{rows.length ? rows.map((row) => <article key={row.id}><b>{row.template.replaceAll("_", " ")}</b><span>{row.createdAt.toLocaleString("en-IN")}</span><span>{row.status}</span></article>) : <div className="empty-state"><h3>No notifications yet</h3><p>Order, payment, shipment and refund updates will appear here.</p></div>}</div></section>; }
