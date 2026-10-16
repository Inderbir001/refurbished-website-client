"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { brand } from "@/lib/brand";
import { inr } from "@/lib/money";
import { AddressSearch, fillAddress } from "@/components/store/address-search";
import { safeFetch } from "@/lib/safe-fetch";
type Address = { id: string; name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; isDefault: boolean };
type Gateway = { id: string; label: string; available: boolean; reason: string };
type ShippingOption = { ruleId?: string; name: string; charge: number; estimatedDaysMin: number; estimatedDaysMax: number };
type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = { key: string; order_id: string; amount: number; currency: string; name: string; description: string; prefill: { name: string; contact: string }; handler: (result: RazorpayResult) => void; modal: { ondismiss: () => void }; method?: Record<string, boolean>; theme?: { color: string } };
declare global { interface Window { Razorpay: new (options: RazorpayOptions) => { open(): void } } }
type PayMethod = "upi" | "card" | "netbanking" | "wallet";
type CartView = { items: { id: string; quantity: number; product: { name: string; images: { url: string }[] }; variant: { title: string } | null }[]; totals: { subtotal: number; discount: number; tax: number; shipping: number; total: number; couponCode?: string | null; couponError?: string } };
const fields = ["name", "phone", "line1", "line2", "city", "state", "pincode"] as const;
const AUTO = "__auto__";
async function loadRazorpay() { if (window.Razorpay) return; await new Promise<void>((resolve, reject) => { const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]'); if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); return; } const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Razorpay Checkout could not be loaded.")); document.head.appendChild(script); }); }

export function CheckoutForm({ addresses, gateways }: { addresses: Address[]; gateways: Gateway[] }) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const availableGateways = gateways.filter((item) => item.available);
  const firstGateway = availableGateways[0]?.id ?? "";
  const [gateway, setGateway] = useState(firstGateway);
  const [method, setMethod] = useState<PayMethod>("upi");
  const [cart, setCart] = useState<CartView | null>(null);
  useEffect(() => { safeFetch("/api/cart").then((response) => response.json()).then((result) => setCart(result.data)).catch(() => setCart(null)); }, []);
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  async function applyCoupon() {
    setCouponBusy(true); setCouponMessage("");
    try {
      const response = await safeFetch("/api/cart/coupon", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: couponInput.trim() }) });
      const result = await response.json();
      if (!response.ok) setCouponMessage(result.error ?? "That coupon could not be applied.");
      else { setCart(result.data); setCouponInput(""); }
    } catch { setCouponMessage("Could not apply the coupon. Please try again."); }
    setCouponBusy(false);
  }
  async function removeCoupon() {
    setCouponBusy(true); setCouponMessage("");
    try { await safeFetch("/api/cart/coupon", { method: "DELETE" }); const result = await (await safeFetch("/api/cart")).json(); setCart(result.data); } catch { setCouponMessage("Could not remove the coupon."); }
    setCouponBusy(false);
  }
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
      safeFetch("/api/checkout/shipping-options", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: effectiveState, pincode: effectivePincode }) })
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
      const response = await safeFetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, billingAddress, gateway, idempotencyKey: idempotencyKey.current, ...(chosenShipping?.ruleId ? { shippingRuleId: chosenShipping.ruleId } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Checkout could not be started.");
      const paymentResponse = await safeFetch("/api/payments/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentId: result.data.paymentId, confirmationToken: result.data.confirmationToken }) });
      const intent = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(intent.error ?? "Payment gateway is unavailable.");
      if (gateway === "PHONEPE") { if (!intent.data.redirectUrl) throw new Error("PhonePe returned no checkout URL."); window.location.assign(intent.data.redirectUrl); return; }
      if (gateway !== "RAZORPAY") throw new Error("This payment method is awaiting merchant activation.");
      await loadRazorpay();
      const checkoutData = intent.data.checkoutData as { key: string; razorpayOrderId: string };
      new window.Razorpay({ key: checkoutData.key, order_id: checkoutData.razorpayOrderId, amount: intent.data.amount, currency: intent.data.currency, name: brand.name, description: `Order ${result.data.orderNumber}`, prefill: { name: String(address.name), contact: String(address.phone) }, theme: { color: "#fb6b48" }, method: { upi: method === "upi", card: method === "card", netbanking: method === "netbanking", wallet: method === "wallet", emi: false, paylater: false }, handler: async (gatewayResult) => { const verification = await safeFetch("/api/payments/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentId: result.data.paymentId, payload: gatewayResult }) }); const verified = await verification.json(); if (!verification.ok) { setLoading(false); setError(verified.error ?? "Payment could not be verified. Please contact support before retrying."); return; } router.push(`/order-success/${verified.data.confirmationToken}`); }, modal: { ondismiss: () => { setLoading(false); setError("Payment was not completed. Your reserved order will expire automatically."); } } }).open();
    } catch (caught) { setLoading(false); setError(caught instanceof Error ? caught.message : "Payment could not be started."); }
  }

  const labels: Record<(typeof fields)[number], string> = { name: "Full name", phone: "Phone number", line1: "Address", line2: "Address line 2 (optional)", city: "City", state: "State", pincode: "Pincode" };
  const holders: Partial<Record<(typeof fields)[number], string>> = { line1: "Flat / house no., building, street", line2: "Landmark, area", phone: "10-digit mobile number", pincode: "6 digits" };
  const autos: Record<(typeof fields)[number], string> = { name: "name", phone: "tel", line1: "address-line1", line2: "address-line2", city: "address-level2", state: "address-level1", pincode: "postal-code" };
  const spans: Record<(typeof fields)[number], string> = { name: "s3", phone: "s3", line1: "s6", line2: "s6", city: "s2", state: "s2", pincode: "s2" };
  const methods: { id: PayMethod; title: string; note: string; icon: string }[] = [
    { id: "upi", title: "UPI", note: "GPay, PhonePe, Paytm, BHIM", icon: "₹" },
    { id: "card", title: "Cards", note: "Credit & debit cards", icon: "▭" },
    { id: "netbanking", title: "Net banking", note: "All major banks", icon: "⌂" },
    { id: "wallet", title: "Wallets", note: "Paytm, Mobikwik & more", icon: "◧" },
  ];
  const items = cart?.items ?? [];
  const totals = cart?.totals;
  const delivery = chosenShipping ? chosenShipping.charge : totals?.shipping ?? 0;
  const payable = totals ? totals.total - totals.shipping + delivery : 0;
  const razorpaySelected = (availableGateways.length === 1 ? availableGateways[0]?.id : gateway) === "RAZORPAY";
  const payLabel = loading ? "Securing order…" : firstGateway ? (payable ? `Pay ${inr(payable)} securely` : "Pay securely") : "Payment unavailable";
  const placeButton = (key: string) => <button key={key} form="co-form" className="primary-button co-pay" disabled={loading || !firstGateway}>{payLabel}</button>;

  return <section className="co-page page-shell">
    <header className="co-head"><p className="eyebrow">SECURE CHECKOUT</p><h1>Checkout</h1></header>
    <div className="co-layout">
      <form id="co-form" ref={formRef} onSubmit={(event) => { event.preventDefault(); void submit(new FormData(event.currentTarget)); }} className="co-form">
        <section className="co-card">
          <h2><span>1</span>Delivery address</h2>
          {addresses.length > 0 && <div className="co-addresses" role="radiogroup" aria-label="Saved addresses">
            {addresses.map((address) => <label key={address.id} className={selectedAddress === address.id ? "co-address on" : "co-address"}><input type="radio" name="saved-address" checked={selectedAddress === address.id} onChange={() => setSelectedAddress(address.id)} /><b>{address.name} <small>{address.phone}</small></b><span>{address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} - {address.pincode}</span></label>)}
            <label className={selectedAddress === "new" ? "co-address on" : "co-address"}><input type="radio" name="saved-address" checked={selectedAddress === "new"} onChange={() => setSelectedAddress("new")} /><b>+ Add a new address</b></label>
          </div>}
          {selectedAddress === "new" && <>
            <AddressSearch onPick={(picked) => { fillAddress(formRef.current, picked); setManualState(picked.state); setManualPincode(picked.pincode); }} />
            <div className="co-fields">{fields.map((field) => <label key={field} className={`co-field ${spans[field]}`}>{labels[field]}<input required={field !== "line2"} name={field} placeholder={holders[field] ?? ""} autoComplete={autos[field]} inputMode={field === "phone" || field === "pincode" ? "numeric" : undefined} maxLength={field === "pincode" ? 6 : undefined} onChange={field === "state" ? (event) => setManualState(event.target.value) : field === "pincode" ? (event) => setManualPincode(event.target.value) : undefined} /></label>)}</div>
          </>}
          <label className="co-check"><input type="checkbox" checked={differentBilling} onChange={(event) => setDifferentBilling(event.target.checked)} /> Billing address is different</label>
          {differentBilling && <div className="co-fields">{fields.map((field) => <label key={`billing_${field}`} className={`co-field ${spans[field]}`}>Billing {labels[field].toLowerCase()}<input required={field !== "line2"} name={`billing_${field}`} autoComplete={`billing ${autos[field]}`} /></label>)}</div>}
        </section>

        <section className="co-card">
          <h2><span>2</span>Delivery</h2>
          {shippingOptions.length > 1
            ? <div className="co-options" role="radiogroup" aria-label="Delivery options">{shippingOptions.map((option) => { const id = option.ruleId ?? AUTO; return <label key={id} className={shippingRuleId === id ? "co-option on" : "co-option"}><input type="radio" name="delivery-option" checked={shippingRuleId === id} onChange={() => setShippingRuleId(id)} /><b>{option.name}</b><span>{option.estimatedDaysMin}-{option.estimatedDaysMax} days</span><strong>{option.charge === 0 ? "Free" : inr(option.charge)}</strong></label>; })}</div>
            : shippingOptions[0]
              ? <div className="co-option on single"><b>{shippingOptions[0].name}</b><span>{shippingOptions[0].estimatedDaysMin}-{shippingOptions[0].estimatedDaysMax} days</span><strong>{shippingOptions[0].charge === 0 ? "Free" : inr(shippingOptions[0].charge)}</strong></div>
              : <p className="co-hint">{shippingLoading ? "Checking delivery options…" : "Choose your address above to see delivery options and charges."}</p>}
        </section>

        <section className="co-card">
          <h2><span>3</span>Payment</h2>
          {/* Only gateways the merchant has actually activated are offered; the others stay in the code and show up automatically once their credentials are added. */}
          {availableGateways.length > 1 && <label className="co-field s6">Pay with<select value={gateway} onChange={(event) => setGateway(event.target.value)}>{availableGateways.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
          <input type="hidden" name="gateway" value={availableGateways.length === 1 ? availableGateways[0].id : gateway} />
          {razorpaySelected && <div className="co-methods" role="radiogroup" aria-label="Payment method">{methods.map((item) => <label key={item.id} className={method === item.id ? "co-method on" : "co-method"}><input type="radio" name="pay-method" checked={method === item.id} onChange={() => setMethod(item.id)} /><i aria-hidden>{item.icon}</i><b>{item.title}</b><span>{item.note}</span></label>)}</div>}
          {availableGateways.length === 0 && <p className="form-error" role="alert">Online payment is not available right now. Please try again later.</p>}
          {razorpaySelected && <p className="co-hint">You&apos;ll enter your {method === "upi" ? "UPI ID or approve in your UPI app" : method === "card" ? "card details" : method === "netbanking" ? "bank login" : "wallet login"} in Razorpay&apos;s secure window. We never see or store it.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="co-pay-row">{placeButton("pay-main")}</div>
          <p className="consent-note">By placing your order you agree to our <Link href="/policies/terms-and-conditions" target="_blank">Terms &amp; Conditions</Link>, <Link href="/policies/privacy-policy" target="_blank">Privacy Policy</Link> and <Link href="/policies/refund-policy" target="_blank">Returns &amp; Refunds Policy</Link>.</p>
        </section>
      </form>

      <aside className="co-summary">
        <h2>Order summary</h2>
        {!cart ? <p className="co-hint">Loading your order…</p> : <>
          <ul className="co-items">{items.map((item) => <li key={item.id}><div className="co-thumb">{item.product.images[0] ? <img src={item.product.images[0].url} alt="" /> : null}<em>{item.quantity}</em></div><div><b>{item.product.name}</b>{item.variant?.title && item.variant.title !== "Standard" && <small>{item.variant.title}</small>}</div></li>)}</ul>
          <div className="co-coupon">
            {totals!.couponCode && !totals!.couponError
              ? <p className="co-coupon-on"><span>🏷 <b>{totals!.couponCode}</b> applied</span><button type="button" className="link-button" disabled={couponBusy} onClick={removeCoupon}>Remove</button></p>
              : <form onSubmit={(event) => { event.preventDefault(); void applyCoupon(); }}><input value={couponInput} onChange={(event) => { setCouponInput(event.target.value.toUpperCase()); setCouponMessage(""); }} placeholder="Have a coupon code?" aria-label="Coupon code" autoComplete="off" /><button disabled={couponBusy || !couponInput.trim()}>{couponBusy ? "…" : "Apply"}</button></form>}
            {totals!.couponError && <p className="co-coupon-error">{totals!.couponError} <button type="button" className="link-button" disabled={couponBusy} onClick={removeCoupon}>Remove it</button></p>}
            {couponMessage && <p className="co-coupon-error">{couponMessage}</p>}
          </div>
          <div className="co-rows">
            <p><span>Subtotal</span><b>{inr(totals!.subtotal)}</b></p>
            {totals!.discount > 0 && <p className="save"><span>Discount{totals!.couponCode ? ` (${totals!.couponCode})` : ""}</span><b>−{inr(totals!.discount)}</b></p>}
            <p><span>Delivery</span><b>{delivery ? inr(delivery) : "Free"}</b></p>
            <p className="total"><span>Total</span><b>{inr(payable)}</b></p>
            <p className="gst-note">Inclusive of GST ₹{(totals!.tax / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          </div>
          <p className="co-secure">🔒 Payments are processed by Razorpay. No card number or CVV touches {brand.name}, and orders are confirmed only after the payment is verified. <Link href="/cart">Edit cart</Link></p>
        </>}
      </aside>
    </div>
  </section>;
}
