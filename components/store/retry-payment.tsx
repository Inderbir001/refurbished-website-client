"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = { key: string; order_id: string; amount: number; currency: string; name: string; description: string; handler: (result: RazorpayResult) => void; modal: { ondismiss: () => void } };
type RazorpayWindow = { Razorpay: new (options: RazorpayOptions) => { open(): void } };

async function loadRazorpay() {
  if ((window as unknown as RazorpayWindow).Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay Checkout could not be loaded."));
    document.head.appendChild(script);
  });
}

export function RetryPayment({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/payments/retry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, gateway: "RAZORPAY" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Payment retry could not be created.");
      const intentResponse = await fetch("/api/payments/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentId: result.data.paymentId, confirmationToken: result.data.confirmationToken }) });
      const intent = await intentResponse.json();
      if (!intentResponse.ok) throw new Error(intent.error ?? "Razorpay is unavailable.");
      await loadRazorpay();
      const checkoutData = intent.data.checkoutData as { key: string; razorpayOrderId: string };
      const Razorpay = (window as unknown as RazorpayWindow).Razorpay;
      new Razorpay({ key: checkoutData.key, order_id: checkoutData.razorpayOrderId, amount: intent.data.amount, currency: intent.data.currency, name: "RefurbShield", description: `Order ${result.data.orderNumber}`, handler: async (gatewayResult) => {
        const verification = await fetch("/api/payments/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentId: result.data.paymentId, payload: gatewayResult }) });
        const verified = await verification.json();
        if (!verification.ok) { setBusy(false); setMessage(verified.error ?? "Payment could not be verified."); return; }
        router.push(`/order-success/${verified.data.confirmationToken}`);
      }, modal: { ondismiss: () => { setBusy(false); setMessage("Payment was not completed. Your reservation remains active until it expires."); } } }).open();
    } catch (error) { setBusy(false); setMessage(error instanceof Error ? error.message : "Payment retry failed."); }
  }
  return <div><button className="secondary-button" onClick={retry} disabled={busy}>{busy ? "Opening secure payment…" : "Retry payment"}</button>{message && <small>{message}</small>}</div>;
}
