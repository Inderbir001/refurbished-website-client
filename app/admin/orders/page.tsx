import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderStatus, PaymentStatus, Prisma, Role } from "@prisma/client";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; payment?: string }> }) {
  const session = await currentSession();
  const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.ORDER_MANAGER];
  if (!session || !allowedRoles.includes(session.role)) redirect("/login");
  const params = await searchParams; const status = Object.values(OrderStatus).includes(params.status as OrderStatus) ? params.status as OrderStatus : undefined; const paymentStatus = Object.values(PaymentStatus).includes(params.payment as PaymentStatus) ? params.payment as PaymentStatus : undefined; const where: Prisma.OrderWhereInput = { status, paymentStatus, OR: params.q ? [{ orderNumber: { contains: params.q, mode: "insensitive" } }, { user: { email: { contains: params.q, mode: "insensitive" } } }, { user: { name: { contains: params.q, mode: "insensitive" } } }] : undefined };
  const orders = await db.order.findMany({ where, include: { user: { select: { name: true, email: true } }, payments: true }, orderBy: { createdAt: "desc" } });
  return <section className="admin-page"><Link href="/admin" className="text-link">← Dashboard</Link><p className="eyebrow">FULFILMENT</p><h1>Orders</h1><form className="inline-admin-form"><div className="form-columns"><label>Search<input name="q" defaultValue={params.q} placeholder="Order number, customer or email" /></label><label>Order status<select name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{Object.values(OrderStatus).map((value) => <option key={value}>{value}</option>)}</select></label><label>Payment status<select name="payment" defaultValue={paymentStatus ?? ""}><option value="">All payments</option>{Object.values(PaymentStatus).map((value) => <option key={value}>{value}</option>)}</select></label></div><div className="row-actions"><button className="primary-button">Filter</button><Link className="secondary-button" href="/admin/orders">Clear</Link><a className="secondary-button" href="/api/admin/orders/export">Export CSV</a></div></form><div className="admin-panel">{orders.length ? <table><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Status</th><th>Total</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><Link href={`/admin/orders/${order.id}`}>{order.orderNumber} →</Link></td><td>{order.user?.name ?? "Guest checkout"}<small>{order.user?.email}</small></td><td>{order.paymentStatus}</td><td>{order.status}</td><td>{inr(order.total)}</td></tr>)}</tbody></table> : <p>No orders match these filters. An order cannot be marked paid without a verified gateway response.</p>}</div></section>;
}
