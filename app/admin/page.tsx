import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";
import { brand } from "@/lib/brand";
import { Wordmark } from "@/components/store/wordmark";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const session = await currentSession();
  const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER, Role.ORDER_MANAGER];
  if (!session || !allowedRoles.includes(session.role)) redirect("/login");

  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const month = new Date(now.getFullYear(), now.getMonth(), 1); const chartStart = new Date(today); chartStart.setDate(chartStart.getDate() - 13);
  const [products, orders, customers, sales, todaySales, monthSales, pending, processing, completed, cancelled, stockRows, outOfStock, recent, recentCustomers, salesSeries, topItems] = await Promise.all([
    db.product.count({ where: { deletedAt: null } }),
    db.order.count(),
    db.user.count({ where: { role: Role.CUSTOMER } }),
    db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "SUCCESS" } }),
    db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "SUCCESS", createdAt: { gte: today } } }),
    db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "SUCCESS", createdAt: { gte: month } } }),
    db.order.count({ where: { status: "PENDING" } }), db.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING", "PACKED"] } } }), db.order.count({ where: { status: "DELIVERED" } }), db.order.count({ where: { status: "CANCELLED" } }),
    db.productVariant.findMany({ where: { stock: { gt: 0 } }, select: { stock: true, lowStockThreshold: true } }),
    db.productVariant.count({ where: { stock: 0 } }),
    db.order.findMany({ take: 6, orderBy: { createdAt: "desc" }, select: { id: true, orderNumber: true, total: true, status: true, createdAt: true } }),
    db.user.findMany({ where: { role: Role.CUSTOMER }, take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, createdAt: true } }),
    db.order.findMany({ where: { paymentStatus: "SUCCESS", createdAt: { gte: chartStart } }, select: { total: true, createdAt: true } }),
    db.orderItem.groupBy({ by: ["productId"], where: { order: { paymentStatus: "SUCCESS" } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
  ]);
  const lowStock = stockRows.filter((row) => row.stock <= row.lowStockThreshold).length;
  const topProducts = await db.product.findMany({ where: { id: { in: topItems.map((item) => item.productId) } }, select: { id: true, name: true } }); const topNames = new Map(topProducts.map((product) => [product.id, product.name]));
  const chart = Array.from({ length: 14 }, (_, index) => { const date = new Date(chartStart); date.setDate(date.getDate() + index); const total = salesSeries.filter((order) => order.createdAt.toDateString() === date.toDateString()).reduce((sum, order) => sum + order.total, 0); return { label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), total }; }); const max = Math.max(1, ...chart.map((item) => item.total));

  return <section className="admin-shell">
    <aside className="admin-nav"><Link className="wordmark" href="/"><Wordmark /></Link><p>ADMINISTRATION</p><Link href="/admin">Overview</Link><Link href="/admin/offers">Offers &amp; deals</Link><Link href="/admin/products">Products</Link><Link href="/admin/categories">Categories</Link><Link href="/admin/brands">Brands</Link><Link href="/admin/collections">Collections</Link><Link href="/admin/inventory">Inventory</Link><Link href="/admin/orders">Orders</Link><Link href="/admin/customers">Customers</Link><Link href="/admin/coupons">Coupons</Link><Link href="/admin/reviews">Reviews</Link><Link href="/admin/payments">Payments</Link><Link href="/admin/shipping">Shipping</Link><Link href="/admin/tax">GST & tax</Link><Link href="/admin/analytics">Analytics</Link><Link href="/admin/storefront">Storefront</Link><Link href="/admin/settings">Settings</Link><Link href="/admin/users">Users & roles</Link><Link href="/admin/audit-logs">Audit logs</Link></aside>
    <div className="admin-main"><p className="eyebrow">STORE OVERVIEW</p><h1>Good morning, {session.email.split("@")[0]}.</h1><div className="stat-grid"><article><span>Sales to date</span><b>{inr(sales._sum.total ?? 0)}</b></article><article><span>Today</span><b>{inr(todaySales._sum.total ?? 0)}</b></article><article><span>This month</span><b>{inr(monthSales._sum.total ?? 0)}</b></article><article><span>Total orders</span><b>{orders}</b></article><article><span>Customers</span><b>{customers}</b></article><article><span>Products</span><b>{products}</b></article><article><span>Low / out of stock</span><b>{lowStock} / {outOfStock}</b></article><article><span>Pending / processing</span><b>{pending} / {processing}</b></article><article><span>Delivered / cancelled</span><b>{completed} / {cancelled}</b></article></div><div className="dashboard-grid"><div className="admin-panel"><h2>14-day verified sales</h2><div className="sales-chart">{chart.map((item) => <div key={item.label} title={`${item.label}: ${inr(item.total)}`}><span style={{ height: `${Math.max(3, item.total / max * 100)}%` }}></span><small>{item.label.split(" ")[0]}</small></div>)}</div></div><div className="admin-panel"><h2>Top-selling products</h2>{topItems.length ? topItems.map((item, index) => <p className="rank-row" key={item.productId}><b>{index + 1}</b><span>{topNames.get(item.productId)}</span><strong>{item._sum.quantity ?? 0} sold</strong></p>) : <p>No verified sales yet.</p>}</div></div><div className="dashboard-grid"><div className="admin-panel"><div className="panel-heading"><h2>Recent orders</h2><Link href="/admin/orders">View all →</Link></div>{recent.length ? <table><thead><tr><th>Order</th><th>Status</th><th>Date</th><th>Total</th></tr></thead><tbody>{recent.map((order) => <tr key={order.id}><td><Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td><td><span className="status">{order.status.replaceAll("_", " ")}</span></td><td>{order.createdAt.toLocaleDateString("en-IN")}</td><td>{inr(order.total)}</td></tr>)}</tbody></table> : <p>No orders yet. Verified payments will appear here automatically.</p>}</div><div className="admin-panel"><h2>Recent customers</h2>{recentCustomers.map((customer) => <p className="rank-row" key={customer.id}><span>{customer.name}<small>{customer.email}</small></span><strong>{customer.createdAt.toLocaleDateString("en-IN")}</strong></p>)}</div></div></div>
  </section>;
}
