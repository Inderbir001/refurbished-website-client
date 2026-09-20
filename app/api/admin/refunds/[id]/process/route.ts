import { PaymentStatus, RefundStatus, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { queueOrderNotification } from "@/lib/notifications/service";
import { providerFor } from "@/lib/payments";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.ORDER_MANAGER]);
    const refund = await db.refund.findUnique({ where: { id: (await context.params).id }, include: { order: true } });
    if (!refund || !refund.paymentId) throw new AppError(404, "Refund or payment reference not found.");
    if (refund.status !== RefundStatus.REQUESTED && refund.status !== RefundStatus.FAILED) throw new AppError(409, "This refund has already been submitted.");
    const payment = await db.payment.findUnique({ where: { id: refund.paymentId } });
    if (!payment || payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.FAILED) throw new AppError(409, "A captured payment is required for a refund.");
    await db.refund.update({ where: { id: refund.id }, data: { status: RefundStatus.PROCESSING } });
    try {
      const result = await providerFor(payment.gateway).refund({ paymentId: payment.id, orderId: payment.orderId, refundId: refund.id, amount: refund.amount, gatewayTransactionId: payment.gatewayTransactionId ?? undefined });
      const completedAmount = await db.refund.aggregate({ _sum: { amount: true }, where: { orderId: refund.orderId, status: RefundStatus.SUCCESS, id: { not: refund.id } } });
      const totalRefunded = (completedAmount._sum.amount ?? 0) + (result.status === "SUCCESS" ? refund.amount : 0);
      const refundStatus = result.status === "SUCCESS" ? RefundStatus.SUCCESS : result.status === "FAILED" ? RefundStatus.FAILED : RefundStatus.PROCESSING;
      const paymentStatus = totalRefunded >= payment.amount ? PaymentStatus.REFUNDED : totalRefunded > 0 ? PaymentStatus.PARTIALLY_REFUNDED : payment.status;
      const updated = await db.$transaction(async (tx) => {
        const record = await tx.refund.update({ where: { id: refund.id }, data: { gatewayRefundId: result.gatewayRefundId, status: refundStatus, metadata: result.metadata } });
        await tx.payment.update({ where: { id: payment.id }, data: { status: paymentStatus, transactions: { create: { type: "REFUND", status: paymentStatus, amount: refund.amount, gatewayEventId: result.gatewayRefundId, metadata: result.metadata } } } });
        if (paymentStatus === PaymentStatus.REFUNDED) await tx.order.update({ where: { id: refund.orderId }, data: { paymentStatus, status: "REFUNDED" } });
        await tx.auditLog.create({ data: { actorId: admin.sub, action: "REFUND_SUBMITTED", entityType: "Refund", entityId: refund.id, after: { gatewayRefundId: result.gatewayRefundId, status: refundStatus } } });
        return record;
      });
      await queueOrderNotification({ userId: refund.order.userId, orderId: refund.orderId, template: result.status === "SUCCESS" ? "REFUND_COMPLETED" : "REFUND_PROCESSING", payload: { orderNumber: refund.order.orderNumber, amount: refund.amount } });
      return json(updated);
    } catch (error) {
      await db.refund.update({ where: { id: refund.id }, data: { status: RefundStatus.FAILED, metadata: { error: error instanceof Error ? error.message : "Provider request failed" } } });
      throw error;
    }
  } catch (error) { return apiError(error); }
}
