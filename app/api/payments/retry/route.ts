import { OrderStatus, PaymentGateway, PaymentStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
const schema = z.object({ orderId: z.string().cuid(), gateway: z.nativeEnum(PaymentGateway) });
export async function POST(request: NextRequest) { try { const session = await requireSession(request); const input = schema.parse(await request.json()); const order = await db.order.findFirst({ where: { id: input.orderId, userId: session.sub }, include: { payments: true, reservations: true } }); if (!order) throw new AppError(404, "Order not found."); if (order.paymentStatus === PaymentStatus.SUCCESS || order.status !== OrderStatus.PENDING) throw new AppError(409, "This order is not eligible for payment retry."); if (!order.reservations.some((reservation) => !reservation.releasedAt && reservation.expiresAt > new Date())) throw new AppError(409, "The stock reservation expired. Please add the products to cart again."); const payment = await db.payment.create({ data: { orderId: order.id, gateway: input.gateway, amount: order.total, currency: order.currency, idempotencyKey: crypto.randomUUID() } }); return json({ paymentId: payment.id, confirmationToken: order.confirmationToken, orderNumber: order.orderNumber }, 201); } catch (error) { return apiError(error); } }
