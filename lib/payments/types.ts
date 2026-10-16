import { PaymentGateway } from "@prisma/client";
export type PaymentIntent = { paymentId: string; orderId: string; amount: number; currency: string; redirectUrl?: string; checkoutData?: Record<string, string> };
export type PaymentState = "PENDING" | "SUCCESS" | "FAILED";
export type RefundResult = { gatewayRefundId: string; status: PaymentState; metadata: Record<string, string> };
// Gateway notifications other than "this payment was captured".
export type WebhookEvent =
  | { kind: "attempt_failed"; attemptId: string; reason?: string }
  | { kind: "refund"; gatewayRefundId: string; status: "PROCESSING" | "SUCCESS" | "FAILED"; gatewayPaymentId?: string }
  | { kind: "dispute"; name: string; disputeId: string; gatewayPaymentId?: string; amount?: number; reason?: string; phase?: string; status?: string };
export interface PaymentProvider {
  gateway: PaymentGateway;
  createPayment(input: { paymentId: string; orderId: string; amount: number; currency: string }): Promise<PaymentIntent>;
  verifyPayment(input: { paymentId: string; orderId: string; amount: number; currency: string; payload: Record<string, string> }): Promise<{ transactionId: string; metadata: Record<string, string> }>;
  verifyWebhook(payload: string, signature?: string): Promise<{ transactionId: string; status: "SUCCESS" | "FAILED"; paymentId?: string; event?: WebhookEvent }>;
  getPaymentStatus(input: { paymentId: string; orderId: string; gatewayTransactionId?: string }): Promise<{ status: PaymentState; transactionId?: string; metadata: Record<string, string> }>;
  refund(input: { paymentId: string; orderId: string; refundId: string; amount: number; gatewayTransactionId?: string }): Promise<RefundResult>;
}
