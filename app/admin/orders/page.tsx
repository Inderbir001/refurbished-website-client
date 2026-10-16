import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderStatus, PaymentStatus, Prisma, Role } from "@prisma/client";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { label, ORDER_STATUS, PAYMENT_STATUS } from "@/lib/admin-labels";

export const dynamic = "force-dynamic";
const PER_PAGE = 30;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; payment?: string; page?: string }> }) {
  const session = await currentSession();
  const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.ORDER_MANAGER];
  if (!session || !allowedRoles.includes(session.role)) redirect("/login");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const status = Object.values(OrderStatus).includes(params.status as OrderStatus) ? (params.status as OrderStatus) : undefined;
  const paymentStatus = Object.values(PaymentStatus).includes(params.payment as PaymentStatus) ? (params.payment as PaymentStatus) : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const where: Prisma.OrderWhereInput = {
    status, paymentStatus,
    OR: q ? [{ orderNumber: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }, { user: { phone: { contains: q } } }, { user: { name: { contains: q, mode: "insensitive" } } }] : undefined,
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, include: { user: { select: { name: true, email: true, phone: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | undefined> = { q, status: params.status, payment: params.payment, ...patch };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const text = next.toString();
    return `/admin/orders${text ? `?${text}` : ""}`;
  };
  const filtered = Boolean(q || status || paymentStatus);

  return <section className="adm-page">
    <div className="adm-head">
      <div><p className="adm-eyebrow">Orders</p><h1>Orders</h1><p>{total} {filtered ? "matching" : "in total"}. Open an order to see items, update its status or ship it.</p></div>
      <a className="adm-btn small ghost" href="/api/admin/orders/export">Download as CSV</a>
    </div>

    <form className="adm-card" style={{ padding: 18 }}>
      <div className="adm-grid three" style={{ alignItems: "end" }}>
        <label className="adm-field">Search<input name="q" defaultValue={q} placeholder="Order number, customer name, phone or email" /></label>
        <label className="adm-field">Order status<select name="status" defaultValue={status ?? ""}><option value="">All</option>{Object.values(OrderStatus).map((value) => <option key={value} value={value}>{label(ORDER_STATUS, value)[0]}</option>)}</select></label>
        <label className="adm-field">Payment<select name="payment" defaultValue={paymentStatus ?? ""}><option value="">All</option>{Object.values(PaymentStatus).map((value) => <option key={value} value={value}>{label(PAYMENT_STATUS, value)[0]}</option>)}</select></label>
      </div>
      <div style={{ display: "flex", gap: 10 }}><button className="adm-btn primary small">Apply</button>{filtered && <Link className="adm-btn small ghost" href="/admin/orders">Clear filters</Link>}</div>
    </form>

    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Status</th><th className="r">Total</th></tr></thead>
        <tbody>
          {orders.map((order) => {
            const [paymentLabel, paymentTone] = label(PAYMENT_STATUS, order.paymentStatus);
            const [orderLabel, orderTone] = label(ORDER_STATUS, order.status);
            return <tr key={order.id}>
              <td><Link href={`/admin/orders/${order.id}`}><b>{order.orderNumber}</b></Link></td>
              <td><small>{order.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</small></td>
              <td>{order.user?.name ?? "Guest checkout"}<br /><small className="adm-hint">{order.user?.phone ?? order.user?.email ?? ""}</small></td>
              <td><span className={`adm-pill ${paymentTone}`}>{paymentLabel}</span></td>
              <td><span className={`adm-pill ${orderTone}`}>{orderLabel}</span></td>
              <td className="r"><b>{inr(order.total)}</b></td>
            </tr>;
          })}
          {!orders.length && <tr><td colSpan={6}><div className="adm-empty"><b>No orders found</b>{filtered ? "Try different filters." : "Orders will appear here as customers buy."}</div></td></tr>}
        </tbody>
      </table>
    </div>
    {pages > 1 && <div className="adm-paging"><span>Page {page} of {pages}</span><span style={{ display: "flex", gap: 8 }}>{page > 1 && <Link className="adm-btn small ghost" href={link({ page: String(page - 1) })}>← Previous</Link>}{page < pages && <Link className="adm-btn small ghost" href={link({ page: String(page + 1) })}>Next →</Link>}</span></div>}
  </section>;
}
