import { PaymentStatus } from "@prisma/client";
import { brand } from "../brand";
import { db } from "../db";
import { AppError } from "../http";
import { financialYear, hsnFor, invoiceNumber, rupeesInWords } from "../gst";
import { getBusinessDetails } from "../site-content";

const PAID: PaymentStatus[] = [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED];
const INVOICE_PREFIX = "MM";

// Gives a paid order its invoice number, once. Numbers run 1, 2, 3... per financial year with no gaps or repeats:
// the order row is locked while the counter moves, so two requests for the same order cannot both take a number.
export async function ensureInvoiceNumber(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { invoiceNumber: true, paymentStatus: true } });
  if (!order) return null;
  if (order.invoiceNumber || !PAID.includes(order.paymentStatus)) return order.invoiceNumber;
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const current = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { invoiceNumber: true } });
    if (current.invoiceNumber) return current.invoiceNumber;
    const issuedAt = new Date();
    const fy = financialYear(issuedAt);
    const counter = await tx.invoiceCounter.upsert({ where: { id: fy }, update: { lastNumber: { increment: 1 } }, create: { id: fy, lastNumber: 1 } });
    const number = invoiceNumber(INVOICE_PREFIX, fy, counter.lastNumber);
    await tx.order.update({ where: { id: orderId }, data: { invoiceNumber: number, invoiceIssuedAt: issuedAt } });
    return number;
  });
}

type Address = { name?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string };
const addressLines = (a: Address) => [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(", ") + (a.pincode ? ` - ${a.pincode}` : "")].filter((line): line is string => Boolean(line && line.trim()));

export type InvoiceLine = { description: string; sku: string; hsn: string; quantity: number; unitPrice: number; taxable: number; rate: number; cgst: number; sgst: number; igst: number; total: number };
export type InvoiceData = {
  number: string; issuedAt: string; title: "TAX INVOICE" | "INVOICE"; detailed: boolean;
  orderNumber: string; orderDate: string; paymentRef: string | null; gateway: string | null;
  seller: { name: string; legalName: string; address: string; gstin: string; email: string; phone: string; state: string };
  buyer: { name: string; businessName: string; gstin: string; phone: string; address: string[]; state: string };
  placeOfSupply: string; supply: "INTRA" | "INTER"; inclusive: boolean;
  lines: InvoiceLine[]; subtotal: number; discount: number; shipping: number; roundOff: number; total: number;
  taxable: number; cgst: number; sgst: number; igst: number; tax: number; couponCode: string | null; amountInWords: string;
};

// Everything printed on an invoice, worked out from the order as it was placed. A buyer who gave a GST number gets a full
// tax invoice (HSN, taxable value, CGST/SGST or IGST per line); everyone else gets a simple invoice with the GST shown as a total.
export async function buildInvoice(orderId: string): Promise<InvoiceData> {
  const number = await ensureInvoiceNumber(orderId);
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: { select: { category: { select: { slug: true } } } } } }, payments: { orderBy: { createdAt: "desc" } }, user: { select: { name: true } } } });
  if (!order) throw new AppError(404, "Order not found.");
  if (!number || !order.invoiceIssuedAt) throw new AppError(409, "An invoice is available once the payment is confirmed.");
  const [store, business] = await Promise.all([db.store.findFirst({ include: { settings: true, taxRules: { where: { isActive: true }, orderBy: { createdAt: "asc" }, take: 1 } } }), getBusinessDetails()]);
  const shipTo = order.shippingAddress as Address;
  const billTo = (order.billingAddress as Address | null) ?? shipTo;
  const intra = order.igstAmount === 0 && order.cgstAmount + order.sgstAmount > 0;
  // Orders placed before GST became inclusive have the tax added on top; newer ones have it inside the listed price.
  const inclusive = order.total === order.subtotal - order.discount + order.shippingAmount;
  const ratio = order.subtotal ? order.discount / order.subtotal : 0;

  const lines: InvoiceLine[] = order.items.map((item) => {
    const rate = item.taxRate;
    const gross = item.unitPrice * item.quantity;
    const net = gross * (1 - ratio);
    const tax = inclusive ? Math.round((net * rate) / (100 + rate)) : Math.round((net * rate) / 100);
    const total = inclusive ? Math.round(net) : Math.round(net) + tax;
    const taxable = total - tax;
    const half = Math.floor(tax / 2);
    return { description: item.name, sku: item.sku, hsn: hsnFor(item.product?.category?.slug), quantity: item.quantity, unitPrice: item.unitPrice, taxable, rate, cgst: intra ? half : 0, sgst: intra ? tax - half : 0, igst: intra ? 0 : tax, total };
  });
  const linesTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const roundOff = order.total - (linesTotal + order.shippingAmount);
  const sum = (pick: (line: InvoiceLine) => number) => lines.reduce((acc, line) => acc + pick(line), 0);
  const settings = store?.settings;
  const detailed = Boolean(order.buyerGstin);
  const gateway = order.payments.find((payment) => payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.PARTIALLY_REFUNDED);
  return {
    number, issuedAt: order.invoiceIssuedAt.toISOString(), title: detailed ? "TAX INVOICE" : "INVOICE", detailed,
    orderNumber: order.orderNumber, orderDate: order.createdAt.toISOString(), paymentRef: gateway?.gatewayTransactionId ?? null, gateway: gateway?.gateway ?? null,
    seller: { name: store?.name ?? brand.name, legalName: business.legalName || store?.name || brand.name, address: business.address, gstin: settings?.gstin ?? "", email: settings?.supportEmail ?? "", phone: settings?.supportPhone ?? "", state: store?.taxRules[0]?.homeState ?? "" },
    buyer: { name: billTo.name ?? order.user?.name ?? "", businessName: order.buyerBusinessName ?? "", gstin: order.buyerGstin ?? "", phone: billTo.phone ?? "", address: addressLines(billTo), state: billTo.state ?? "" },
    placeOfSupply: shipTo.state ?? "", supply: intra ? "INTRA" : "INTER", inclusive,
    lines, subtotal: order.subtotal, discount: order.discount, shipping: order.shippingAmount, roundOff, total: order.total,
    taxable: sum((line) => line.taxable), cgst: sum((line) => line.cgst), sgst: sum((line) => line.sgst), igst: sum((line) => line.igst), tax: sum((line) => line.cgst + line.sgst + line.igst),
    couponCode: order.couponCode, amountInWords: rupeesInWords(order.total),
  };
}
