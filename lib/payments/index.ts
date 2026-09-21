import { PaymentGateway, PaymentStatus } from "@prisma/client";
import { db } from "../db";
import { AppError } from "../http";
import { RazorpayGateway } from "./razorpay";
import { PhonePeGateway } from "./phonepe";
import { ConfiguredGateway } from "./unsupported";
import { PaymentProvider } from "./types";
import { queueOrderNotification } from "../notifications/service";

export function providerFor(gateway: PaymentGateway): PaymentProvider { if (gateway === PaymentGateway.RAZORPAY) return new RazorpayGateway(); if (gateway === PaymentGateway.PHONEPE) return new PhonePeGateway(); return new ConfiguredGateway(gateway, ["SNAPMIT_API_KEY", "SNAPMIT_SECRET"]); }
export async function markPaymentSuccess(paymentId: string, transactionId: string, metadata: Record<string, string>) {
  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
    if (payment.status === PaymentStatus.SUCCESS) return { payment, changed: false, userId: payment.order.userId, orderNumber: payment.order.orderNumber };
    if (payment.gatewayTransactionId && payment.gatewayTransactionId !== transactionId) throw new AppError(409, "Payment transaction mismatch.");
    const updated = await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.SUCCESS, gatewayTransactionId: transactionId, metadata, transactions: { create: { type: "CAPTURE", status: PaymentStatus.SUCCESS, amount: payment.amount, gatewayEventId: transactionId, metadata } }, order: { update: { paymentStatus: PaymentStatus.SUCCESS, status: "CONFIRMED" } } } });
    await tx.inventoryReservation.updateMany({ where: { orderId: payment.orderId, releasedAt: null }, data: { releasedAt: new Date() } });
    if (payment.order.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: payment.order.couponCode } });
      const alreadyUsed = await tx.couponUsage.findUnique({ where: { orderId: payment.orderId } });
      if (coupon && !alreadyUsed) { await tx.couponUsage.create({ data: { couponId: coupon.id, userId: payment.order.userId, orderId: payment.orderId, discount: payment.order.discount } }); await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } }); }
    }
    // Paid: now the shopper's cart can be emptied (it is kept while payment is pending so a failed payment loses nothing).
    if (payment.order.userId) { await tx.cartItem.deleteMany({ where: { cart: { userId: payment.order.userId } } }); await tx.cart.updateMany({ where: { userId: payment.order.userId }, data: { couponCode: null } }); }
    return { payment: updated, changed: true, userId: payment.order.userId, orderNumber: payment.order.orderNumber };
  });
  if (result.changed) await queueOrderNotification({ userId: result.userId, orderId: result.payment.orderId, template: "PAYMENT_CONFIRMED", payload: { orderNumber: result.orderNumber, amount: result.payment.amount } });
  return result.payment;
}

export async function markPaymentFailed(paymentId: string, transactionId: string, metadata: Record<string, string>) {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
  if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.FAILED) return payment;
  const updated = await db.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, gatewayTransactionId: transactionId, metadata, transactions: { create: { type: "PAYMENT_FAILED", status: PaymentStatus.FAILED, amount: payment.amount, gatewayEventId: transactionId, metadata } } } });
  await queueOrderNotification({ userId: payment.order.userId, orderId: payment.orderId, template: "PAYMENT_FAILED", payload: { orderNumber: payment.order.orderNumber } });
  return updated;
}
