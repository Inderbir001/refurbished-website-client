"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { brand } from "@/lib/brand";
import { inr } from "@/lib/money";
type Address = { id: string; name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; isDefault: boolean };
type Gateway = { id: string; label: string; available: boolean; reason: string };
type ShippingOption = { ruleId?: string; name: string; charge: number; estimatedDaysMin: number; estimatedDaysMax: number };
type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = { key: string; order_id: string; amount: number; currency: string; name: string; description: string; prefill: { name: string; contact: string }; handler: (result: RazorpayResult) => void; modal: { ondismiss: () => void } };
declare global { interface Window { Razorpay: new (options: RazorpayOptions) => { open(): void } } }
const fields = ["name", "phone", "line1", "line2", "city", "state", "pincode"] as const;
const AUTO = "__auto__";
async function loadRazorpay() { if (window.Razorpay) return; await new Promise<void>((resolve, reject) => { const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]'); if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); return; } const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Razorpay Checkout could not be loaded.")); document.head.appendChild(script); }); }

export function CheckoutForm({ addresses, gateways }: { addresses: Address[]; gateways: Gateway[] }) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const firstGateway = gateways.find((item) => item.available)?.id ?? "";
  const [selectedAddress, setSelectedAddress] = useState(addresses[0]?.id ?? "new");
  const [differentBilling, setDifferentBilling] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = addresses.find((item) => item.id === selectedAddress);
  // For a manually typed ("new") address: only state and pincode affect delivery options, so that's all this tracks.
  const [manualState, setManualState] = useState("");
  const [manualPincode, setManualPincode] = useState("");
  const effectiveState = selected?.state ?? manualState;
  const effectivePincode = selected?.pincode ?? manualPincode;

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingRuleId, setShippingRuleId] = useState(AUTO);
  const [shippingLoading, setShippingLoading] = useState(false);
  const shippingRequest = useRef(0);
  useEffect(() => {
    if (!effectiveState.trim() || !/^\d{6}$/.test(effectivePincode)) { setShippingOptions([]); return; }
    const requestId = ++shippingRequest.current;
    setShippingLoading(true);
    const timer = setTimeout(() => {
      fetch("/api/checkout/shipping-options", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: effectiveState, pincode: effectivePincode }) })
        .then((response) => response.json())
        .then((result) => { if (requestId !== shippingRequest.current) return; const options: ShippingOption[] = result.data?.options ?? []; setShippingOptions(options); setShippingRuleId(options.length > 1 ? (options[0].ruleId ?? AUTO) : AUTO); })
        .catch(() => { if (requestId === shippingRequest.current) setShippingOptions([]); })
        .finally(() => { if (requestId === shippingRequest.current) setShippingLoading(false); });
    }, 400);
    return () => clearTimeout(timer);
  }, [effectiveState, effectivePincode]);
  const chosenShipping = shippingOptions.find((option) => (option.ruleId ?? AUTO) === shippingRuleId) ?? shippingOptions[0];

  async function submit(form: FormData) {
    setLoading(true); setError("");
    idempotencyKey.current ??= crypto.randomUUID();
    const address = selected ?? Object.fromEntries(fields.map((name) => [name, form.get(name)]));
    const billingAddress = differentBilling ? Object.fromEntries(fields.map((name) => [name, form.get(`billing_${name}`)])) : undefined;
    const gateway = String(form.get("gateway"));
    try {
      if (!gateway) throw new Error("No payment gateway is configured yet.");
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, billingAddress, gateway, idempotencyKey: idempotencyKey.current, ...(chosenShipping?.ruleId ? { shippingRuleId: chosenShipping.ruleId } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Checkout could not be started.");
      const paymentResponse = await fetch("/api/payments/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentId: result.data.paymentId, confirmationToken: result.data.confirmationToken }) });
      const intent = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(intent.error ?? "Payment gateway is unavailable.");
      if (gateway === "PHONEPE") { if (!intent.data.redirectUrl) throw new Error("PhonePe returned no checkout URL."); window.location.assign(intent.data.redirectUrl); return; }
      if (gateway !== "RAZORPAY") throw new Error("This payment method is awaiting merchant activation.");
      await loadRazorpay();
      const checkoutData = intent.data.checkoutData as { key: string; razorpayOrderId: string };
      new window.Razorpay({ key: checkoutData.key, order_id: checkoutData.razorpayOrderId, amount: intent.data.amount, currency: intent.data.currency, name: brand.name, description: `Order ${result.data.orderNumber}`, prefill: { name: String(address.name), contact: String(address.phone) }, handler: async (gatewayResult) => { const verification = await fetch("/api/payments/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentId: result.data.paymentId, payload: gatewayResult }) }); const verified = await verification.json(); if (!verification.ok) { setLoading(false); setError(verified.error ?? "Payment could not be verified. Please contact support before retrying."); return; } router.push(`/order-success/${verified.data.confirmationToken}`); }, modal: { ondismiss: () => { setLoading(false); setError("Payment was not completed. Your reserved order will expire automatically."); } } }).open();
    } catch (caught) { setLoading(false); setError(caught instanceof Error ? caught.message : "Payment could not be started."); }
  }

  return <section className="checkout page-shell"><div><p className="eyebrow">CHECKOUT</p><h1>Delivery & payment</h1><p>Prices, stock, coupon, delivery, GST and payment state are rechecked on the server.</p>
    <form onSubmit={(event) => { event.preventDefault(); void submit(new FormData(event.currentTarget)); }} className="checkout-form">
      {addresses.length > 0 && <label className="wide-field">Saved address<select value={selectedAddress} onChange={(event) => setSelectedAddress(event.target.value)}><option value="new">Use a new address</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.name} — {address.line1}, {address.city}</option>)}</select></label>}
      {selectedAddress === "new" && fields.map((field) => <label key={field}>{field === "line1" ? "Address" : field === "line2" ? "Address line 2" : field[0].toUpperCase() + field.slice(1)}<input required={field !== "line2"} name={field} placeholder={field === "pincode" ? "560001" : ""} onChange={field === "state" ? (event) => setManualState(event.target.value) : field === "pincode" ? (event) => setManualPincode(event.target.value) : undefined} /></label>)}
      <label className="wide-field checkbox-label"><input type="checkbox" checked={differentBilling} onChange={(event) => setDifferentBilling(event.target.checked)} /> Use a different billing address</label>
      {differentBilling && fields.map((field) => <label key={`billing_${field}`}>Billing {field.replace("line1", "address").replace("line2", "address line 2")}<input required={field !== "line2"} name={`billing_${field}`} /></label>)}
      <label className="wide-field">Delivery{shippingOptions.length > 1
        ? <select value={shippingRuleId} onChange={(event) => setShippingRuleId(event.target.value)}>{shippingOptions.map((option) => <option key={option.ruleId ?? AUTO} value={option.ruleId ?? AUTO}>{option.name} — {option.charge === 0 ? "Free" : inr(option.charge)} · {option.estimatedDaysMin}-{option.estimatedDaysMax} days</option>)}</select>
        : <select disabled><option>{shippingLoading ? "Checking delivery options…" : shippingOptions[0] ? `${shippingOptions[0].name} — ${shippingOptions[0].charge === 0 ? "Free" : inr(shippingOptions[0].charge)} · ${shippingOptions[0].estimatedDaysMin}-${shippingOptions[0].estimatedDaysMax} days` : "Enter your address to see delivery options"}</option></select>}
      </label>
      <label className="wide-field">Payment method<select name="gateway" defaultValue={firstGateway}>{gateways.map((gateway) => <option key={gateway.id} value={gateway.available ? gateway.id : ""} disabled={!gateway.available}>{gateway.label}{gateway.available ? "" : " — unavailable"}</option>)}</select></label>
      <div className="gateway-help wide-field">{gateways.filter((item) => !item.available).map((item) => <small key={item.id}><b>{item.label}:</b> {item.reason}</small>)}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={loading || !firstGateway}>{loading ? "Securing order…" : firstGateway ? "Continue to secure payment" : "Payment credentials required"}</button>
      <p className="consent-note wide-field">By placing your order you agree to our <Link href="/policies/terms-and-conditions" target="_blank">Terms &amp; Conditions</Link>, <Link href="/policies/privacy-policy" target="_blank">Privacy Policy</Link> and <Link href="/policies/refund-policy" target="_blank">Returns &amp; Refunds Policy</Link>.</p>
    </form>
  </div><aside className="checkout-note"><b>Safe by design</b><p>No card number or CVV touches {brand.name}. Orders are paid only after server-side gateway verification or an authenticated webhook.</p><small>Unpaid stock reservations expire and are released automatically.</small></aside></section>;
}
