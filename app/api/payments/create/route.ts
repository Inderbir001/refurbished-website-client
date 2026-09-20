import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { providerFor } from "@/lib/payments";
import { PaymentStatus, Prisma } from "@prisma/client";
import { sessionFromRequest } from "@/lib/auth";
const schema = z.object({ paymentId: z.string().cuid(), confirmationToken: z.string().min(32) });
export async function POST(request: NextRequest) { try { const { paymentId, confirmationToken } = schema.parse(await request.json()); const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: true } }); if (!payment) throw new AppError(404, "Payment not found."); const session = await sessionFromRequest(request); if (payment.order.confirmationToken !== confirmationToken && (!session || payment.order.userId !== session.sub)) throw new AppError(403, "This payment does not belong to your checkout."); if (payment.status === PaymentStatus.SUCCESS) throw new AppError(409, "This order is already paid."); const saved = payment.metadata as { paymentIntent?: unknown } | null; if (payment.status === PaymentStatus.PROCESSING && saved?.paymentIntent) return json(saved.paymentIntent); const intent = await providerFor(payment.gateway).createPayment({ paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, currency: payment.currency }); await db.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.PROCESSING, metadata: { paymentIntent: intent } as Prisma.InputJsonValue } }); return json(intent); } catch (error) { return apiError(error); } }
