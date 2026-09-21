"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const cartEvent = "cart:changed";

// Call with any cart response so the header badge updates immediately.
export function announceCart(cart: { items: { quantity: number }[] }) {
  window.dispatchEvent(new CustomEvent(cartEvent, { detail: { count: cart.items.reduce((sum, item) => sum + item.quantity, 0) } }));
}

// Instant feedback: nudge the badge before the server has answered (announceCart then sets the real number).
export function announceCartDelta(delta: number) {
  window.dispatchEvent(new CustomEvent(cartEvent, { detail: { delta } }));
}

export function CartBadge({ initial }: { initial: number }) {
  const pathname = usePathname();
  const [count, setCount] = useState(initial);
  useEffect(() => { setCount(initial); }, [initial]);
  useEffect(() => {
    const onChange = (event: Event) => { const detail = (event as CustomEvent<{ count?: number; delta?: number }>).detail; if (typeof detail.count === "number") setCount(detail.count); else if (typeof detail.delta === "number") setCount((current) => Math.max(0, current + detail.delta!)); };
    window.addEventListener(cartEvent, onChange);
    return () => window.removeEventListener(cartEvent, onChange);
  }, []);
  // The header persists across client navigations, so re-check after each one (e.g. after an order empties the cart).
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/cart/count", { signal: controller.signal }).then((response) => response.json()).then((result) => { if (typeof result.data?.count === "number") setCount(result.data.count); }).catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);
  return count > 0 ? <b key={count} className="sh-badge" aria-label={`${count} items in cart`}>{count > 99 ? "99+" : count}</b> : null;
}
