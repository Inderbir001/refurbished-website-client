import { InventoryReason, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "../db";
import { queueOrderNotification } from "../notifications/service";

export async function releaseExpiredReservations(now = new Date()) {
  const orders = await db.order.findMany({
    where: { status: OrderStatus.PENDING, paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] }, reservations: { some: { releasedAt: null, expiresAt: { lte: now } } } },
    select: { id: true, orderNumber: true, userId: true },
  });
  const released: string[] = [];
  for (const order of orders) {
    const changed = await db.$transaction(async (tx) => {
      const reservations = await tx.inventoryReservation.findMany({ where: { orderId: order.id, releasedAt: null, expiresAt: { lte: now } } });
      if (!reservations.length) return false;
      for (const reservation of reservations) {
        const variant = await tx.productVariant.update({ where: { id: reservation.variantId }, data: { stock: { increment: reservation.quantity } } });
        await tx.inventoryTransaction.create({ data: { variantId: reservation.variantId, quantityDelta: reservation.quantity, previousStock: variant.stock - reservation.quantity, resultingStock: variant.stock, reason: InventoryReason.ORDER_CANCELLED, reference: order.orderNumber } });
      }
      await tx.inventoryReservation.updateMany({ where: { orderId: order.id, releasedAt: null }, data: { releasedAt: now } });
      await tx.payment.updateMany({ where: { orderId: order.id, status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] } }, data: { status: PaymentStatus.CANCELLED } });
      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.CANCELLED } });
      await tx.auditLog.create({ data: { action: "RESERVATION_EXPIRED", entityType: "Order", entityId: order.id, after: { releasedAt: now.toISOString() } as Prisma.InputJsonValue } });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (changed) { released.push(order.id); await queueOrderNotification({ userId: order.userId, orderId: order.id, template: "ORDER_EXPIRED", payload: { orderNumber: order.orderNumber } }); }
  }
  return released;
}
