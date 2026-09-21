import crypto from "node:crypto";
import { InventoryReason, OrderStatus, PaymentGateway, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "../db";
import { AppError } from "../http";
import { priceFor } from "../money";
import { CartActor, couponLines, getCart } from "./cart-service";
import { validateCouponForCart } from "./coupon-service";
import { calculateCheckoutTotals } from "./pricing-service";
import { canTransitionOrder } from "./order-state";
import { quoteShipping } from "./shipping-service";
import { queueOrderNotification } from "../notifications/service";
import { releaseExpiredReservations } from "./reservation-service";

export type AddressInput = { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string };
export async function createOrder(actor: CartActor, address: AddressInput, gateway: PaymentGateway, idempotencyKey: string, billingAddress?: AddressInput) {
  const existing = await db.payment.findUnique({ where: { idempotencyKey }, include: { order: true } });
  if (existing) return db.order.findUniqueOrThrow({ where: { id: existing.orderId }, include: { payments: true, items: true } });
  // Starting a new checkout supersedes this shopper's earlier unpaid orders: give their reserved stock back first.
  if (actor.userId) await releaseExpiredReservations(new Date(Date.now() + 60 * 60_000), { userId: actor.userId, notify: false });
  const cart = await getCart(actor);
  if (!cart.items.length) throw new AppError(400, "Your cart is empty.");
  const couponQuote = cart.couponCode ? await validateCouponForCart(cart.couponCode, couponLines(cart), actor.userId) : null;
  const preliminarySubtotal = cart.items.reduce((sum, item) => sum + priceFor(item.variant ?? { price: null, salePrice: null }, item.product) * item.quantity, 0);
  const shippingQuote = await quoteShipping({ state: address.state, pincode: address.pincode, subtotal: preliminarySubtotal - (couponQuote?.discount ?? 0) });
  const taxRule = await db.taxRule.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  const order = await db.$transaction(async (tx) => {
    const lines: { productId: string; variantId: string; name: string; sku: string; unitPrice: number; quantity: number; taxRate: number }[] = [];
    for (const item of cart.items) {
      if (!item.variantId) throw new AppError(400, "Each cart item must have a variant.");
      const result = await tx.productVariant.updateMany({ where: { id: item.variantId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
      if (result.count !== 1) throw new AppError(409, `${item.product.name} has insufficient stock.`);
      const current = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
      const unitPrice = priceFor(current, item.product);
      lines.push({ productId: item.productId, variantId: item.variantId, name: item.product.name, sku: current.sku, unitPrice, quantity: item.quantity, taxRate: item.product.taxRate });
      await tx.inventoryTransaction.create({ data: { variantId: item.variantId, quantityDelta: -item.quantity, previousStock: current.stock + item.quantity, resultingStock: current.stock, reason: InventoryReason.ORDER_RESERVATION, reference: idempotencyKey } });
    }
    const totals = calculateCheckoutTotals(lines, { discount: couponQuote?.discount, shippingAmount: shippingQuote.charge });
    const intraState = taxRule ? address.state.toLowerCase() === taxRule.homeState.toLowerCase() : false;
    const order = await tx.order.create({ data: { confirmationToken: crypto.randomBytes(24).toString("hex"), orderNumber: `RS-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`, userId: actor.userId, couponCode: couponQuote?.coupon.code, subtotal: totals.subtotal, discount: totals.discount, taxAmount: totals.tax, cgstAmount: intraState ? Math.floor(totals.tax / 2) : 0, sgstAmount: intraState ? totals.tax - Math.floor(totals.tax / 2) : 0, igstAmount: intraState ? 0 : totals.tax, shippingAmount: totals.shipping, total: totals.total, shippingAddress: { ...address, deliveryMethod: shippingQuote.name, estimatedDaysMin: shippingQuote.estimatedDaysMin, estimatedDaysMax: shippingQuote.estimatedDaysMax }, billingAddress: billingAddress ?? address, status: OrderStatus.PENDING, paymentStatus: PaymentStatus.PENDING, items: { create: lines }, payments: { create: { gateway, amount: totals.total, status: PaymentStatus.PENDING, idempotencyKey } }, reservations: { create: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity, expiresAt: new Date(Date.now() + 15 * 60 * 1000) })) } }, include: { payments: true, items: true } });
    // The cart is emptied only once the payment succeeds (see markPaymentSuccess), so a failed or abandoned payment leaves it intact.
    return order;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await queueOrderNotification({ userId: actor.userId, orderId: order.id, template: "ORDER_PLACED", payload: { orderNumber: order.orderNumber, total: order.total } });
  return order;
}
export async function transitionOrder(orderId: string, next: OrderStatus, actorId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, shipment: true } });
  if (!canTransitionOrder(order.status, next)) throw new AppError(409, `Cannot move an order from ${order.status} to ${next}.`);
  const updated = await db.$transaction(async (tx) => {
    if (next === OrderStatus.CANCELLED || next === OrderStatus.RETURNED) for (const item of order.items) if (item.variantId) {
      const variant = await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      await tx.inventoryTransaction.create({ data: { variantId: item.variantId, quantityDelta: item.quantity, previousStock: variant.stock - item.quantity, resultingStock: variant.stock, reason: next === OrderStatus.RETURNED ? InventoryReason.RETURN : InventoryReason.ORDER_CANCELLED, reference: order.orderNumber, actorId } });
    }
    const result = await tx.order.update({ where: { id: orderId }, data: { status: next } });
    if (next === OrderStatus.CANCELLED) { await tx.inventoryReservation.updateMany({ where: { orderId, releasedAt: null }, data: { releasedAt: new Date() } }); await tx.payment.updateMany({ where: { orderId, status: PaymentStatus.PENDING }, data: { status: PaymentStatus.CANCELLED } }); }
    if (next === OrderStatus.DELIVERED && order.shipment) await tx.shipment.update({ where: { id: order.shipment.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
    await tx.auditLog.create({ data: { actorId, action: "ORDER_STATUS_CHANGED", entityType: "Order", entityId: orderId, before: { status: order.status }, after: { status: next } } }); return result;
  });
  await queueOrderNotification({ userId: order.userId, orderId, template: `ORDER_${next}`, payload: { orderNumber: order.orderNumber, previousStatus: order.status, status: next } });
  return updated;
}
