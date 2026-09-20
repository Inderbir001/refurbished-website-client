"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { brand } from "@/lib/brand";

const storageKey = `${brand.fileSlug}_cookie_consent`;
type Choice = "all" | "essential";

// First-visit cookie notice. The choice is remembered in the browser (and in a cookie the server could read later).
// Right now the site only sets essential cookies (sign-in, cart, this choice); "Accept all" is ready for analytics later.
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(storageKey); } catch { /* storage blocked: ask each visit */ }
    if (!saved) { const timer = setTimeout(() => setVisible(true), 1200); return () => clearTimeout(timer); }
  }, []);

  useEffect(() => {
    const reopen = () => setVisible(true);
    window.addEventListener("cookie:reopen", reopen);
    return () => window.removeEventListener("cookie:reopen", reopen);
  }, []);

  function choose(choice: Choice) {
    try { localStorage.setItem(storageKey, choice); } catch { /* ignore */ }
    document.cookie = `cookie_consent=${choice}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    window.dispatchEvent(new CustomEvent("cookie:consent", { detail: choice }));
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div className="cookie-banner" role="region" aria-label="Cookie consent">
      <div className="cookie-icon" aria-hidden="true">🍪</div>
      <div className="cookie-copy">
        <b>We use cookies</b>
        <p>Essential cookies keep you signed in and remember your cart. With your OK, we may also use cookies to understand how the site is used and make it better. See our <Link href="/policies/cookie-policy">Cookie Policy</Link>.</p>
      </div>
      <div className="cookie-actions">
        <button type="button" className="cookie-accept" onClick={() => choose("all")}>Accept all</button>
        <button type="button" className="cookie-essential" onClick={() => choose("essential")}>Essential only</button>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  return <button type="button" className="cookie-settings" onClick={() => window.dispatchEvent(new Event("cookie:reopen"))}>Cookie settings</button>;
}
