import { Env, RefundRequest, StandardCheckoutClient, StandardCheckoutPayRequest } from "@phonepe-pg/pg-sdk-node";
import { PaymentGateway } from "@prisma/client";
import { AppError } from "../http";
import { PaymentIntent, PaymentProvider, PaymentState, RefundResult } from "./types";
import { brand } from "../brand";

function phonePeClient() {
  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const clientVersion = Number(process.env.PHONEPE_CLIENT_VERSION ?? "1");
  if (!clientId || !clientSecret || !Number.isInteger(clientVersion)) throw new AppError(503, "PhonePe is not configured.");
  const environment = process.env.PHONEPE_ENVIRONMENT === "production" ? Env.PRODUCTION : Env.SANDBOX;
  return StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, environment, false);
}

function stateOf(value: string): PaymentState {
  if (value === "COMPLETED") return "SUCCESS";
  if (value === "FAILED") return "FAILED";
  return "PENDING";
}

export class PhonePeGateway implements PaymentProvider {
  gateway = PaymentGateway.PHONEPE;

  async createPayment(input: { paymentId: string; orderId: string; amount: number; currency: string }): Promise<PaymentIntent> {
    if (input.currency !== "INR") throw new AppError(400, "PhonePe checkout supports INR orders only.");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new AppError(503, "NEXT_PUBLIC_APP_URL is required for PhonePe redirects.");
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(input.paymentId)
      .amount(input.amount)
      .redirectUrl(`${appUrl}/checkout/payment?paymentId=${encodeURIComponent(input.paymentId)}`)
      .message(`${brand.name} order ${input.orderId}`)
      .expireAfter(900)
      .build();
    try {
      const response = await phonePeClient().pay(request);
      if (!response.redirectUrl) throw new Error("PhonePe returned no redirect URL.");
      return { ...input, redirectUrl: response.redirectUrl, checkoutData: { phonePeOrderId: response.orderId, state: response.state } };
    } catch (error) {
      console.error("PhonePe create payment failed", error);
      throw new AppError(502, "PhonePe could not start checkout.");
    }
  }

  async getPaymentStatus(input: { paymentId: string; orderId: string; gatewayTransactionId?: string }) {
    try {
      const response = await phonePeClient().getOrderStatus(input.paymentId, true);
      const attempt = response.paymentDetails?.find((detail) => detail.state === "COMPLETED") ?? response.paymentDetails?.at(-1);
      return {
        status: stateOf(response.state),
        transactionId: attempt?.transactionId ?? response.orderId,
        metadata: { phonePeOrderId: response.orderId, phonePeState: response.state, phonePeAmount: String(response.amount) },
      };
    } catch (error) {
      console.error("PhonePe status check failed", error);
      throw new AppError(502, "PhonePe payment status could not be verified.");
    }
  }

  async verifyPayment(input: { paymentId: string; orderId: string; amount: number; currency: string; payload: Record<string, string> }) {
    const result = await this.getPaymentStatus(input);
    if (result.status !== "SUCCESS" || !result.transactionId) throw new AppError(409, result.status === "FAILED" ? "PhonePe reports that this payment failed." : "PhonePe payment is still pending.");
    if (result.metadata.phonePeAmount && Number(result.metadata.phonePeAmount) !== input.amount) throw new AppError(409, "PhonePe payment amount does not match this order.");
    return { transactionId: result.transactionId, metadata: result.metadata };
  }

  async verifyWebhook(payload: string, signature?: string) {
    const username = process.env.PHONEPE_CALLBACK_USERNAME;
    const password = process.env.PHONEPE_CALLBACK_PASSWORD;
    if (!username || !password || !signature) throw new AppError(400, "PhonePe callback credentials or authorization header are missing.");
    try {
      const callback = phonePeClient().validateCallback(username, password, signature, payload);
      const attempt = callback.payload.paymentDetails?.find((detail) => detail.state === "COMPLETED") ?? callback.payload.paymentDetails?.at(-1);
      return {
        transactionId: attempt?.transactionId ?? callback.payload.orderId,
        paymentId: callback.payload.merchantOrderId,
        status: stateOf(callback.payload.state) === "SUCCESS" ? "SUCCESS" as const : "FAILED" as const,
      };
    } catch (error) {
      console.error("PhonePe callback validation failed", error);
      throw new AppError(400, "Invalid PhonePe callback.");
    }
  }

  async refund(input: { paymentId: string; orderId: string; refundId: string; amount: number; gatewayTransactionId?: string }): Promise<RefundResult> {
    const request = RefundRequest.builder()
      .merchantRefundId(input.refundId)
      .originalMerchantOrderId(input.paymentId)
      .amount(input.amount)
      .build();
    try {
      const response = await phonePeClient().refund(request);
      return { gatewayRefundId: response.refundId, status: stateOf(response.state), metadata: { phonePeState: response.state } };
    } catch (error) {
      console.error("PhonePe refund failed", error);
      throw new AppError(502, "PhonePe could not start the refund.");
    }
  }
}
