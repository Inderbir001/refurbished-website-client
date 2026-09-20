import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { RazorpayGateway } from "../lib/payments/razorpay";

describe("payment service", () => {
  const original = process.env.RAZORPAY_WEBHOOK_SECRET;
  afterEach(() => { process.env.RAZORPAY_WEBHOOK_SECRET = original; });

  it("accepts a correctly signed capture webhook and preserves the internal payment id", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
    const payload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123", notes: { paymentId: "internal_123" } } } } });
    const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest("hex");
    await expect(new RazorpayGateway().verifyWebhook(payload, signature)).resolves.toEqual({ transactionId: "pay_123", paymentId: "internal_123", status: "SUCCESS" });
  });

  it("rejects an invalid webhook signature", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
    await expect(new RazorpayGateway().verifyWebhook("{}", "invalid")).rejects.toMatchObject({ status: 400 });
  });
});
