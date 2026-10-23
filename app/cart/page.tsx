"use client";
import Link from "next/link";
import { Pic } from "@/components/store/pic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { announceCart } from "@/components/store/cart-badge";
import { inr } from "@/lib/money";
import { safeFetch } from "@/lib/safe-fetch";
type Cart = { items: { id: string; quantity: number; product: { name: string; images: { url: string }[] }; variant: { title: string } | null }[]; totals: { subtotal: number; discount: number; tax: number; shipping: number; total: number; couponCode?: string | null; couponError?: string } };
// The cart's frame keeps the height of the tallest state it has shown, so the footer below stays where it is
// while the cart loads and while items are added or removed (instead of jumping up and down).
function Stage({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [floor, setFloor] = useState(0);
  useLayoutEffect(() => { const height = ref.current?.offsetHeight ?? 0; if (height > floor + 1) setFloor(height); });
  return <section ref={ref} className={`${className} cart-stage`} style={floor ? { minHeight: floor } : undefined}>{children}</section>;
}
export default function Cart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => safeFetch("/api/cart").then((response) => response.json()).then((result) => setCart(result.data)).catch(() => setError("We could not load your cart."));
  useEffect(() => { void load(); }, []);
  async function update(itemId: string, quantity: number) { const response = await safeFetch("/api/cart/items", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId, quantity }) }); const result = await response.json(); if (!response.ok) setError(result.error); else { setCart(result.data); announceCart(result.data); } }
  async function applyCoupon(form: FormData) { const response = await safeFetch("/api/cart/coupon", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: form.get("code") }) }); const result = await response.json(); if (!response.ok) setError(result.error); else { setError(""); setCart(result.data); } }
  // The coupon that was applied can go stale later (expired, used up…). A cart-level error never blocks checkout on
  // its own, but leaving it attached is confusing, so this makes it easy to see and clear.
  async function removeCoupon() { setBusy(true); await safeFetch("/api/cart/coupon", { method: "DELETE" }); await load(); setBusy(false); }
  if (!cart) return <Stage className="page-shell"><p className="eyebrow">YOUR CART</p><h1>Ready when you are.</h1><div className="cart-skeleton" aria-busy="true" aria-label="Loading your cart"><span /><span /></div></Stage>; if (!cart.items.length) return <Stage className="page-shell empty-state"><h1>Your cart is empty</h1><p>When you find the right device, it will wait for you here.</p><Link className="primary-button" href="/products">Browse products</Link></Stage>;
  return <Stage className="cart-page page-shell"><div><p className="eyebrow">YOUR CART</p><h1>Ready when you are.</h1>{error && <p className="form-error">{error}</p>}<div className="cart-lines">{cart.items.map((item) => <article key={item.id}><div className="cart-image">{item.product.images[0] && <Pic src={item.product.images[0].url} size={480} />}</div><div><h3>{item.product.name}</h3><p>{item.variant?.title}</p><div className="quantity"><button onClick={() => update(item.id, item.quantity - 1)}>−</button><b>{item.quantity}</b><button onClick={() => update(item.id, item.quantity + 1)}>+</button><button className="remove" onClick={() => update(item.id, 0)}>Remove</button></div></div></article>)}</div></div><aside className="order-summary"><h2>Order summary</h2><form onSubmit={(event) => { event.preventDefault(); void applyCoupon(new FormData(event.currentTarget)); }} className="coupon-form"><input name="code" placeholder="Coupon code" defaultValue={cart.totals.couponCode ?? ""} /><button>Apply</button></form>{cart.totals.couponError && <p className="form-error coupon-error">{cart.totals.couponError} <button type="button" className="link-button" disabled={busy} onClick={removeCoupon}>Remove it</button></p>}<p><span>Subtotal</span><b>{inr(cart.totals.subtotal)}</b></p>{cart.totals.discount > 0 && <p><span>Discount ({cart.totals.couponCode})</span><b>−{inr(cart.totals.discount)}</b></p>}<p><span>Delivery</span><b>{cart.totals.shipping ? inr(cart.totals.shipping) : "Free"}</b></p><hr /><p className="total"><span>Total</span><b>{inr(cart.totals.total)}</b></p><p className="gst-note">Inclusive of GST {inr(cart.totals.tax)}</p></aside><div className="cartbar" role="region" aria-label="Checkout"><div className="cb-info"><small>Total · {cart.items.reduce((sum, item) => sum + item.quantity, 0)} {cart.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "item" : "items"}</small><strong>{inr(cart.totals.total)}</strong></div><Link className="cb-btn" href="/checkout">Continue to checkout <span aria-hidden>→</span></Link></div></Stage>;
}
