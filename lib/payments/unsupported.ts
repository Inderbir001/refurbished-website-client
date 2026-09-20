import { PaymentGateway } from "@prisma/client";
import { AppError } from "../http";
import { PaymentIntent, PaymentProvider, RefundResult } from "./types";
export class ConfiguredGateway implements PaymentProvider {
  constructor(public gateway: PaymentGateway, private envKeys: string[]) {}
  private assertConfigured() { if (this.envKeys.some((key) => !process.env[key])) throw new AppError(503, `${this.gateway} is not configured by the store administrator.`); }
  async createPayment(input: { paymentId: string; orderId: string; amount: number; currency: string }): Promise<PaymentIntent> { this.assertConfigured(); throw new AppError(501, `${this.gateway} requires its provider-specific redirect adapter before it can be enabled.`); }
  async verifyPayment(): Promise<{ transactionId: string; metadata: Record<string, string> }> { throw new AppError(501, "Payment verification adapter is not enabled."); }
  async verifyWebhook(): Promise<{ transactionId: string; status: "SUCCESS" | "FAILED"; paymentId?: string }> { throw new AppError(501, "Webhook verification adapter is not enabled."); }
  async getPaymentStatus(): Promise<{ status: "PENDING"; metadata: Record<string, string> }> { this.assertConfigured(); throw new AppError(501, "Payment status adapter is not enabled."); }
  async refund(): Promise<RefundResult> { throw new AppError(501, "Refund adapter is not enabled."); }
}
