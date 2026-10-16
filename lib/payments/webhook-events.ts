import { PaymentStatus, RefundStatus } from "@prisma/client";
import { db } from "../db";
import { queueOrderNotification } from "../notifications/service";
import type { WebhookEvent } from "./types";

// What the payment gateway tells us besides "captured". All handlers are safe to run twice (gateways retry webhooks).
export async function handleWebhookEvent(input: { paymentId?: string; event: WebhookEvent }) {
  const { event } = input;
  if (event.kind === "attempt_failed") return recordFailedAttempt(input.paymentId, event);
  if (event.kind === "refund") return syncRefund(event);
  return recordDispute(event);
}

// A failed attempt is only logged on the payment's history. The payment itself stays open so the customer can retry,
// and the abandoned order is cleaned up by the normal reservation expiry.
async function recordFailedAttempt(paymentId: string | undefined, event: Extract<WebhookEvent, { kind: "attempt_failed" }>) {
  if (!paymentId) return;
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === PaymentStatus.SUCCESS) return;
  const gatewayEventId = `attempt:${event.attemptId}`;
  await db.paymentTransaction.upsert({ where: { gatewayEventId }, update: {}, create: { paymentId, gatewayEventId, type: "ATTEMPT_FAILED", status: PaymentStatus.FAILED, amount: payment.amount, metadata: { reason: event.reason ?? "" } } });
}

// Razorpay finishes most refunds after the admin submits them. This is what moves a refund from "processing" to done
// (or failed, so the admin can retry), updates the payment and order, and tells the customer.
async function syncRefund(event: Extract<WebhookEvent, { kind: "refund" }>) {
  const refund = await db.refund.findUnique({ where: { gatewayRefundId: event.gatewayRefundId }, include: { order: true } });
  if (!refund) {
    await db.auditLog.create({ data: { action: "REFUND_WEBHOOK_UNMATCHED", entityType: "Refund", entityId: event.gatewayRefundId, after: { status: event.status, gatewayPaymentId: event.gatewayPaymentId ?? null } } });
    return;
  }
  if (refund.status === RefundStatus.SUCCESS) return;
  const status = event.status === "SUCCESS" ? RefundStatus.SUCCESS : event.status === "FAILED" ? RefundStatus.FAILED : RefundStatus.PROCESSING;
  if (status === refund.status) return;
  await db.$transaction(async (tx) => {
    await tx.refund.update({ where: { id: refund.id }, data: { status } });
    if (status === RefundStatus.SUCCESS && refund.paymentId) {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId } });
      const done = await tx.refund.aggregate({ _sum: { amount: true }, where: { paymentId: payment.id, status: RefundStatus.SUCCESS } });
      const totalRefunded = (done._sum.amount ?? 0);
      const paymentStatus = totalRefunded >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
      await tx.payment.update({ where: { id: payment.id }, data: { status: paymentStatus, transactions: { create: { type: "REFUND", status: paymentStatus, amount: refund.amount, gatewayEventId: `${event.gatewayRefundId}:processed`, metadata: { webhook: "verified" } } } } });
      if (paymentStatus === PaymentStatus.REFUNDED) await tx.order.update({ where: { id: refund.orderId }, data: { paymentStatus, status: "REFUNDED" } });
    }
    await tx.auditLog.create({ data: { action: `REFUND_${status}`, entityType: "Refund", entityId: refund.id, after: { gatewayRefundId: event.gatewayRefundId, source: "webhook" } } });
  });
  if (status === RefundStatus.SUCCESS) await queueOrderNotification({ userId: refund.order.userId, orderId: refund.orderId, template: "REFUND_COMPLETED", payload: { orderNumber: refund.order.orderNumber, amount: refund.amount } });
}

// A customer disputed a charge with their bank. The store has a short deadline to answer in the Razorpay dashboard, so
// make it visible: an audit entry plus a note on the order.
async function recordDispute(event: Extract<WebhookEvent, { kind: "dispute" }>) {
  const payment = event.gatewayPaymentId ? await db.payment.findFirst({ where: { gatewayTransactionId: event.gatewayPaymentId }, include: { order: true } }) : null;
  await db.auditLog.create({ data: { action: `PAYMENT_DISPUTE_${event.name.toUpperCase()}`, entityType: "Payment", entityId: payment?.id ?? event.gatewayPaymentId ?? event.disputeId, after: { disputeId: event.disputeId, amount: event.amount ?? null, reason: event.reason ?? null, phase: event.phase ?? null, status: event.status ?? null } } });
  if (payment) {
    const note = `[${new Date().toISOString().slice(0, 10)}] Razorpay dispute ${event.name.replaceAll("_", " ")} (${event.disputeId})${event.reason ? `, reason ${event.reason}` : ""}. Respond in the Razorpay dashboard.`;
    await db.order.update({ where: { id: payment.orderId }, data: { internalNotes: [payment.order.internalNotes, note].filter(Boolean).join("\n") } });
  }
}
