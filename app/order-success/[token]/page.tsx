import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function OrderSuccess({ params }: { params: Promise<{ token: string }> }) {
  const order = await db.order.findUnique({ where: { confirmationToken: (await params).token }, include: { items: true } });
  if (!order) notFound();
  return <section className="page-shell success-page"><p className="eyebrow">ORDER CONFIRMED</p><h1>Thank you. We&apos;ve got it.</h1><p>Your payment has been verified and order <b>{order.orderNumber}</b> is now {order.status.toLowerCase()}.</p><div className="order-summary"><p><span>{order.items.reduce((count, item) => count + item.quantity, 0)} items</span><b>{inr(order.total)}</b></p><p><span>Payment</span><b>{order.paymentStatus}</b></p><p><span>Fulfilment</span><b>{order.status.replaceAll("_", " ")}</b></p></div><Link className="primary-button" href="/products">Continue shopping</Link></section>;
}
