import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/store/print-button";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/money";

export const dynamic = "force-dynamic";

type Address = { name?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; deliveryMethod?: string; estimatedDaysMin?: number; estimatedDaysMax?: number };
const steps = ["Confirmed", "Packed", "Shipped", "Out for delivery", "Delivered"];
const stepIndex: Record<string, number> = { PENDING: -1, CONFIRMED: 0, PROCESSING: 0, PACKED: 1, SHIPPED: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4, RETURN_REQUESTED: 4, RETURNED: 4 };
const gatewayLabel: Record<string, string> = { RAZORPAY: "Razorpay", PHONEPE: "PhonePe", SNAPMIT: "Snapmint" };
const day = (date: Date) => date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

function AddressBlock({ title, address }: { title: string; address: Address }) {
  return <div><h3>{title}</h3><p><b>{address.name}</b><br />{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state} {address.pincode}<br />Phone: {address.phone}</p></div>;
}

export default async function OrderSuccess({ params }: { params: Promise<{ token: string }> }) {
  const order = await db.order.findUnique({ where: { confirmationToken: (await params).token }, include: { items: true, payments: { orderBy: { createdAt: "desc" } }, shipment: true } });
  if (!order) notFound();

  const [session, products, variants] = await Promise.all([
    currentSession(),
    db.product.findMany({ where: { id: { in: order.items.map((item) => item.productId) } }, select: { id: true, slug: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } }),
    db.productVariant.findMany({ where: { id: { in: order.items.flatMap((item) => (item.variantId ? [item.variantId] : [])) } }, select: { id: true, title: true } }),
  ]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const variantTitle = new Map(variants.map((variant) => [variant.id, variant.title]));

  const paid = order.paymentStatus === "SUCCESS" || order.paymentStatus === "PARTIALLY_REFUNDED" || order.paymentStatus === "REFUNDED";
  const closed = order.status === "CANCELLED";
  const payment = order.payments.find((entry) => entry.status === "SUCCESS") ?? order.payments[0];
  const shipping = order.shippingAddress as Address;
  const billing = order.billingAddress as Address | null;
  const addressKey = (address: Address) => [address.name, address.phone, address.line1, address.line2, address.city, address.state, address.pincode].map((part) => (part ?? "").trim().toLowerCase()).join("|");
  const sameBilling = !billing || addressKey(billing) === addressKey(shipping);
  const itemCount = order.items.reduce((count, item) => count + item.quantity, 0);
  const placed = order.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const eta = shipping.estimatedDaysMin != null && shipping.estimatedDaysMax != null ? `${day(addDays(order.createdAt, shipping.estimatedDaysMin))} – ${day(addDays(order.createdAt, shipping.estimatedDaysMax))}` : null;
  const current = stepIndex[order.status] ?? -1;
  const owner = Boolean(session && order.userId === session.sub);

  const headline = paid && !closed
    ? { tone: "ok", eyebrow: "ORDER CONFIRMED", title: `Thank you${shipping.name ? `, ${shipping.name.split(" ")[0]}` : ""}!`, text: <>Your payment was verified and order <b>{order.orderNumber}</b> is confirmed. We&apos;ll get it ready for dispatch.</> }
    : closed
      ? { tone: "bad", eyebrow: "ORDER CANCELLED", title: "This order was cancelled.", text: <>Order <b>{order.orderNumber}</b> was cancelled{order.paymentStatus === "CANCELLED" ? " because payment wasn’t completed in time" : ""}. Reserved items were released back to stock.</> }
      : { tone: "wait", eyebrow: "AWAITING PAYMENT", title: "We haven’t received your payment yet.", text: <>Order <b>{order.orderNumber}</b> is reserved for a short time. If you’ve just paid, this page will update once the payment is confirmed — refresh in a moment.</> };

  return <section className="receipt page-shell">
    <header className={`receipt-hero ${headline.tone}`}>
      <span className="receipt-icon" aria-hidden="true">{headline.tone === "ok" ? <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg> : headline.tone === "bad" ? <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg> : <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>}</span>
      <div><p className="eyebrow">{headline.eyebrow}</p><h1>{headline.title}</h1><p className="receipt-lead">{headline.text}</p></div>
      <dl className="receipt-meta"><div><dt>Order number</dt><dd>{order.orderNumber}</dd></div><div><dt>Placed on</dt><dd>{placed}</dd></div><div><dt>{paid ? "Amount paid" : "Amount due"}</dt><dd>{inr(order.total)}</dd></div>{eta && paid && !closed && <div><dt>Estimated delivery</dt><dd>{eta}</dd></div>}</dl>
    </header>

    {paid && !closed && <ol className="tracker" aria-label="Order progress">{steps.map((step, index) => <li key={step} className={index < current ? "done" : index === current ? "current" : ""}><span>{index < current ? "✓" : index + 1}</span>{step}</li>)}</ol>}

    <div className="receipt-grid">
      <div>
        <div className="receipt-card">
          <h2>Items in your order <small>{order.items.length} {order.items.length === 1 ? "product" : "products"} · {itemCount} {itemCount === 1 ? "unit" : "units"}</small></h2>
          <ul className="receipt-items">{order.items.map((item) => {
            const product = productById.get(item.productId);
            const image = product?.images[0]?.url;
            const title = item.variantId ? variantTitle.get(item.variantId) : undefined;
            return <li key={item.id}>
              <div className="receipt-thumb">{image ? <img src={image} alt="" /> : <span>No image</span>}</div>
              <div className="receipt-info">{product ? <Link href={`/products/${product.slug}`}>{item.name}</Link> : <b>{item.name}</b>}{title && <small>{title}</small>}<small>SKU {item.sku}</small></div>
              <div className="receipt-qty">{item.quantity} × {inr(item.unitPrice)}</div>
              <b className="receipt-line">{inr(item.unitPrice * item.quantity)}</b>
            </li>;
          })}</ul>
        </div>

        <div className="receipt-card receipt-addresses">
          <AddressBlock title="Delivering to" address={shipping} />
          {!sameBilling && billing && <AddressBlock title="Billing address" address={billing} />}
          <div><h3>Delivery method</h3><p><b>{shipping.deliveryMethod ?? "Standard delivery"}</b><br />{eta ? `Expected ${eta}` : "We’ll share tracking once it ships."}{sameBilling && <><br />Billing address is the same as delivery.</>}</p></div>
        </div>
      </div>

      <aside>
        <div className="receipt-card receipt-summary">
          <h2>Payment summary</h2>
          <p><span>Subtotal</span><b>{inr(order.subtotal)}</b></p>
          {order.discount > 0 && <p className="save"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span><b>−{inr(order.discount)}</b></p>}
          <p><span>Delivery</span><b>{order.shippingAmount ? inr(order.shippingAmount) : "Free"}</b></p>
          {order.igstAmount > 0 ? <p><span>IGST</span><b>{inr(order.igstAmount)}</b></p> : order.cgstAmount + order.sgstAmount > 0 ? <><p><span>CGST</span><b>{inr(order.cgstAmount)}</b></p><p><span>SGST</span><b>{inr(order.sgstAmount)}</b></p></> : <p><span>GST</span><b>{inr(order.taxAmount)}</b></p>}
          <p className="grand"><span>{paid ? "Total paid" : "Total"}</span><b>{inr(order.total)}</b></p>
          {payment && <div className="receipt-pay"><span className={`pay-pill ${paid ? "ok" : "wait"}`}>{paid ? "Paid" : order.paymentStatus.toLowerCase()}</span><small>{gatewayLabel[payment.gateway] ?? payment.gateway}{payment.gatewayTransactionId ? ` · ${payment.gatewayTransactionId}` : ""}</small></div>}
        </div>
        <div className="receipt-actions no-print">
          <Link className="primary-button" href="/products">Continue shopping</Link>
          {owner && <Link className="secondary-button" href={`/account/orders/${order.id}`}>Track order</Link>}
          {paid && <PrintButton />}
        </div>
        {!owner && paid && <p className="receipt-note no-print">Bookmark this page — it&apos;s your receipt. <Link href="/register">Create an account</Link> to track orders and reorder faster.</p>}
      </aside>
    </div>

    {paid && !closed && <div className="receipt-next no-print"><h2>What happens next</h2><div><article><b>1 · We prepare your order</b><p>Every device is checked and packed before it ships.</p></article><article><b>2 · It ships{eta ? ` · arrives ${eta}` : ""}</b><p>Tracking details appear here and in your account once it&apos;s dispatched.</p></article><article><b>3 · Easy returns</b><p>Not right? Start a return from your account within the return window.</p></article></div></div>}
  </section>;
}
