import { PaymentStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { markPaymentFailed, markPaymentSuccess, providerFor } from "@/lib/payments";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) throw new AppError(401, "Invalid maintenance credentials.");
    const payments = await db.payment.findMany({ where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, take: 50, orderBy: { createdAt: "asc" } });
    const reconciled: string[] = [];
    for (const payment of payments) {
      try {
        const result = await providerFor(payment.gateway).getPaymentStatus({ paymentId: payment.id, orderId: payment.orderId, gatewayTransactionId: payment.gatewayTransactionId ?? undefined });
        if (result.status === "SUCCESS" && result.transactionId) await markPaymentSuccess(payment.id, result.transactionId, { ...result.metadata, reconciliation: "verified" });
        else if (result.status === "FAILED") await markPaymentFailed(payment.id, result.transactionId ?? `${payment.gateway}:${payment.id}:failed`, { ...result.metadata, reconciliation: "verified" });
        else continue;
        reconciled.push(payment.id);
      } catch (error) { console.error("Payment reconciliation failed", payment.id, error); }
    }
    return json({ checked: payments.length, reconciled: reconciled.length, paymentIds: reconciled });
  } catch (error) { return apiError(error); }
}
