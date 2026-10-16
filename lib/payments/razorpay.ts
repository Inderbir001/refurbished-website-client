import crypto from "node:crypto";
import { PaymentGateway } from "@prisma/client";
import { AppError } from "../http";
import { PaymentIntent, PaymentProvider } from "./types";

const credentials = () => ({ id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET });

function signaturesMatch(expected: string, received: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export class RazorpayGateway implements PaymentProvider {
  gateway = PaymentGateway.RAZORPAY;

  async createPayment(input: { paymentId: string; orderId: string; amount: number; currency: string }): Promise<PaymentIntent> {
    const { id, secret } = credentials();
    if (!id || !secret) throw new AppError(503, "Razorpay is not configured.");
    const token = Buffer.from(`${id}:${secret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { authorization: `Basic ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ amount: input.amount, currency: input.currency, receipt: input.orderId, notes: { paymentId: input.paymentId } }),
    });
    if (!response.ok) throw new AppError(502, "Razorpay could not create a payment order.");
    const result = await response.json() as { id: string };
    return { ...input, checkoutData: { key: id, razorpayOrderId: result.id, internalPaymentId: input.paymentId } };
  }

  async verifyPayment(input: { paymentId: string; orderId: string; amount: number; currency: string; payload: Record<string, string> }) {
    const { id, secret } = credentials();
    if (!id || !secret) throw new AppError(503, "Razorpay is not configured.");
    const orderId = input.payload.razorpay_order_id;
    const paymentId = input.payload.razorpay_payment_id;
    const signature = input.payload.razorpay_signature;
    if (!orderId || !paymentId || !signature) throw new AppError(400, "Incomplete Razorpay payment response.");
    const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    if (!signaturesMatch(expected, signature)) throw new AppError(400, "Payment signature verification failed.");
    const token = Buffer.from(`${id}:${secret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { authorization: `Basic ${token}` } });
    if (!response.ok) throw new AppError(502, "Razorpay payment could not be checked.");
    const payment = await response.json() as { id: string; order_id: string; amount: number; currency: string; status: string };
    if (payment.order_id !== orderId || payment.amount !== input.amount || payment.currency !== input.currency || payment.status !== "captured") throw new AppError(409, "Razorpay payment details do not match this order or are not captured.");
    return { transactionId: paymentId, metadata: { razorpayOrderId: orderId, razorpayState: payment.status } };
  }

  async verifyWebhook(payload: string, signature?: string): ReturnType<PaymentProvider["verifyWebhook"]> {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) throw new AppError(400, "Webhook signature is missing.");
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (!signaturesMatch(expected, signature)) throw new AppError(400, "Invalid webhook signature.");
    type Entity = { id: string; payment_id?: string; amount?: number; status?: string; notes?: { paymentId?: string }; error_description?: string; reason_code?: string; phase?: string };
    const body = JSON.parse(payload) as { payload?: { payment?: { entity?: Entity }; refund?: { entity?: Entity }; dispute?: { entity?: Entity } }; event?: string };
    const event = body.event ?? "";
    const entity = body.payload?.payment?.entity;
    // A captured payment confirms the order. Everything else is either recorded (see lib/payments/webhook-events.ts) or
    // acknowledged and ignored; it never marks the order failed, because one failed attempt may be followed by a good retry.
    if (entity && (event === "payment.captured" || event === "order.paid")) return { transactionId: entity.id, paymentId: entity.notes?.paymentId, status: "SUCCESS" as const };
    const ignored = { transactionId: entity?.id ?? "", paymentId: undefined, status: "FAILED" as const };
    if (event === "payment.failed" && entity) return { ...ignored, paymentId: entity.notes?.paymentId, event: { kind: "attempt_failed" as const, attemptId: entity.id, reason: entity.error_description } };
    const refund = body.payload?.refund?.entity;
    if (refund && (event === "refund.created" || event === "refund.processed" || event === "refund.failed")) return { ...ignored, event: { kind: "refund" as const, gatewayRefundId: refund.id, gatewayPaymentId: refund.payment_id ?? entity?.id, status: event === "refund.processed" ? "SUCCESS" as const : event === "refund.failed" ? "FAILED" as const : "PROCESSING" as const } };
    const dispute = body.payload?.dispute?.entity;
    if (dispute && event.startsWith("payment.dispute.")) return { ...ignored, event: { kind: "dispute" as const, name: event.replace("payment.dispute.", ""), disputeId: dispute.id, gatewayPaymentId: dispute.payment_id ?? entity?.id, amount: dispute.amount, reason: dispute.reason_code, phase: dispute.phase, status: dispute.status } };
    return ignored;
  }

  async getPaymentStatus(input: { paymentId: string; orderId: string; gatewayTransactionId?: string }) {
    const { id, secret } = credentials();
    if (!id || !secret) throw new AppError(503, "Razorpay is not configured.");
    if (!input.gatewayTransactionId) return { status: "PENDING" as const, metadata: {} as Record<string, string> };
    const token = Buffer.from(`${id}:${secret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.gatewayTransactionId)}`, { headers: { authorization: `Basic ${token}` } });
    if (!response.ok) throw new AppError(502, "Razorpay payment status could not be retrieved.");
    const result = await response.json() as { id: string; status: string; order_id?: string };
    const status = result.status === "captured" ? "SUCCESS" as const : result.status === "failed" ? "FAILED" as const : "PENDING" as const;
    return { status, transactionId: result.id, metadata: { razorpayOrderId: result.order_id ?? "", razorpayState: result.status } };
  }

  async refund(input: { paymentId: string; orderId: string; refundId: string; amount: number; gatewayTransactionId?: string }) {
    const { id, secret } = credentials();
    if (!id || !secret) throw new AppError(503, "Razorpay is not configured.");
    if (!input.gatewayTransactionId) throw new AppError(409, "The captured Razorpay transaction ID is missing.");
    const token = Buffer.from(`${id}:${secret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.gatewayTransactionId)}/refund`, {
      method: "POST",
      headers: { authorization: `Basic ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ amount: input.amount, speed: "normal", receipt: input.refundId, notes: { internalRefundId: input.refundId } }),
    });
    if (!response.ok) throw new AppError(502, "Razorpay could not start the refund.");
    const result = await response.json() as { id: string; status: string };
    return { gatewayRefundId: result.id, status: result.status === "processed" ? "SUCCESS" as const : result.status === "failed" ? "FAILED" as const : "PENDING" as const, metadata: { razorpayState: result.status } };
  }
}
