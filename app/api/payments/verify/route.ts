import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { markPaymentSuccess, providerFor } from "@/lib/payments";
const schema = z.object({ paymentId: z.string().cuid(), payload: z.record(z.string()) });
export async function POST(request: NextRequest) { try { const { paymentId, payload } = schema.parse(await request.json()); const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: true } }); if (!payment) throw new AppError(404, "Payment not found."); const verified = await providerFor(payment.gateway).verifyPayment({ paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, currency: payment.currency, payload }); await markPaymentSuccess(payment.id, verified.transactionId, verified.metadata); return json({ verified: true, confirmationToken: payment.order.confirmationToken }); } catch (error) { return apiError(error); } }
