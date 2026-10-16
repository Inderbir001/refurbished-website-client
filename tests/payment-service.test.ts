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

  const signed = (event: object) => { process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"; const payload = JSON.stringify(event); return { payload, signature: crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest("hex") }; };

  it("treats a failed attempt as a log entry, never as the end of the payment", async () => {
    const { payload, signature } = signed({ event: "payment.failed", payload: { payment: { entity: { id: "pay_bad", notes: { paymentId: "internal_9" }, error_description: "Card declined" } } } });
    const result = await new RazorpayGateway().verifyWebhook(payload, signature);
    expect(result.event).toEqual({ kind: "attempt_failed", attemptId: "pay_bad", reason: "Card declined" });
    expect(result.paymentId).toBe("internal_9");
  });

  it("reads refund notifications", async () => {
    const make = (event: string) => signed({ event, payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_1" } } } });
    for (const [event, status] of [["refund.created", "PROCESSING"], ["refund.processed", "SUCCESS"], ["refund.failed", "FAILED"]] as const) {
      const { payload, signature } = make(event);
      expect((await new RazorpayGateway().verifyWebhook(payload, signature)).event).toEqual({ kind: "refund", gatewayRefundId: "rfnd_1", gatewayPaymentId: "pay_1", status });
    }
  });

  it("reads dispute notifications and ignores unrelated events", async () => {
    const dispute = signed({ event: "payment.dispute.created", payload: { dispute: { entity: { id: "disp_1", payment_id: "pay_1", amount: 5000, reason_code: "fraud", phase: "chargeback" } } } });
    expect((await new RazorpayGateway().verifyWebhook(dispute.payload, dispute.signature)).event).toMatchObject({ kind: "dispute", name: "created", disputeId: "disp_1", gatewayPaymentId: "pay_1" });
    const settlement = signed({ event: "settlement.processed", payload: { settlement: { entity: { id: "setl_1" } } } });
    const ignored = await new RazorpayGateway().verifyWebhook(settlement.payload, settlement.signature);
    expect(ignored.event).toBeUndefined();
    expect(ignored.paymentId).toBeUndefined();
  });

  it("rejects an invalid webhook signature", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
    await expect(new RazorpayGateway().verifyWebhook("{}", "invalid")).rejects.toMatchObject({ status: 400 });
  });
});
