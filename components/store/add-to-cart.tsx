"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { announceCart, announceCartDelta } from "@/components/store/cart-badge";
import { inr } from "@/lib/money";
import { safeFetch } from "@/lib/safe-fetch";

type Variant = { id: string; title: string; stock: number };

// The buying area of a product page: choose a configuration, then Add to cart or Buy now.
// A bar with the same buttons stays fixed at the bottom of the screen while the main buttons are out of sight.
export function AddToCart({ productId, variants, price, original, sold = 0 }: { productId: string; variants: Variant[]; price: number; original: number; sold?: number }) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  const [inlineVisible, setInlineVisible] = useState(true);
  const actions = useRef<HTMLDivElement>(null);
  const chosen = variants.find((variant) => variant.id === variantId);
  const stock = chosen?.stock ?? 0;
  const available = stock > 0;

  useEffect(() => {
    const element = actions.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    // "Visible" means above the fixed bar, so the bar slides away only when the real buttons are comfortably on screen.
    const observer = new IntersectionObserver(([entry]) => setInlineVisible(entry.isIntersecting), { rootMargin: "0px 0px -90px 0px", threshold: 0.6 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  async function put() {
    announceCartDelta(1);
    try {
      const response = await safeFetch("/api/cart/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, variantId, quantity: 1, lite: true }) });
      if (!response.ok) { announceCartDelta(-1); return false; }
      announceCart((await response.json()).data);
      return true;
    } catch { announceCartDelta(-1); return false; }
  }
  async function add() {
    setBusy("add"); setMessage({ ok: true, text: "Adding to your cart…" });
    const ok = await put();
    setMessage(ok ? { ok: true, text: "Added to your cart." } : { ok: false, text: "We could not add this item. Please try again." });
    setBusy(null);
  }
  async function buy() {
    setBusy("buy"); setMessage(null);
    if (await put()) { router.push("/checkout"); return; }
    setMessage({ ok: false, text: "We could not start your order. Please try again." });
    setBusy(null);
  }
  async function save() {
    const response = await safeFetch("/api/account/wishlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) });
    setMessage({ ok: response.ok, text: response.ok ? "Saved to your wishlist." : "Sign in to save products." });
  }

  // Honest urgency only: real stock when it is low, and real sales when there are some.
  const urgency = available && stock <= 5 ? { tone: "hot", text: `Only ${stock} left in stock, order soon` } : sold >= 3 ? { tone: "proof", text: `${sold} sold so far` } : null;
  const buttons = (compact: boolean) => <>
    <button type="button" className="buy-btn line" onClick={add} disabled={!available || busy !== null}>{busy === "add" ? "Adding…" : available ? "Add to cart" : "Out of stock"}</button>
    <button type="button" className="buy-btn solid" onClick={buy} disabled={!available || busy !== null}>{busy === "buy" ? "Please wait…" : compact ? "Buy now" : "Buy now"}</button>
  </>;

  return <>
    <div className="purchase-box">
      {variants.length > 1 && <label>Choose configuration<select value={variantId} onChange={(event) => setVariantId(event.target.value)}>{variants.map((variant) => <option key={variant.id} value={variant.id} disabled={!variant.stock}>{variant.title}{!variant.stock ? " — Out of stock" : ""}</option>)}</select></label>}
      {urgency && <p className={`urgency ${urgency.tone}`}><i aria-hidden />{urgency.text}</p>}
      <div className="buy-actions" ref={actions}>{buttons(false)}</div>
      <button type="button" className="save-later" onClick={save}>♡ Save for later</button>
      {message && <p className={message.ok ? "buy-note" : "buy-note bad"} role="status" aria-live="polite">{message.text}</p>}
    </div>

    <div className={inlineVisible ? "buybar is-hidden" : "buybar"} role="region" aria-label="Buy this product" inert={inlineVisible}>
      <div className="bb-info">
        <span className="bb-price"><strong>{inr(price)}</strong>{original > price && <del>{inr(original)}</del>}</span>
        <small className={urgency?.tone === "hot" ? "hot" : ""}>{!available ? "Currently unavailable" : urgency?.tone === "hot" ? `Only ${stock} left` : variants.length > 1 && chosen ? chosen.title : "In stock"}</small>
      </div>
      <div className="bb-actions">{buttons(true)}</div>
    </div>
  </>;
}
