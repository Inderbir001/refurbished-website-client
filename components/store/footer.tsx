import Link from "next/link";
import { brand } from "@/lib/brand";
import { POLICIES } from "@/lib/policies";
import { CookieSettingsButton } from "@/components/store/cookie-banner";
import { Wordmark } from "@/components/store/wordmark";

const shop = [["Shop all", "/products"], ["Top deals", "/products?sort=price-asc"], ["Certified refurbished", "/products?condition=REFURBISHED"], ["Pre-owned", "/products?condition=USED"]];
const account = [["Sign in", "/login"], ["Create account", "/register"], ["My orders", "/account/orders"], ["Cart", "/cart"]];

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-grid">
      <div className="footer-brand">
        <Link href="/" className="wordmark"><Wordmark /></Link>
        <p>{brand.tagline}. Better devices, honest condition grades and warranty on every order. Every certified refurbished phone is tested and graded before it ships.</p>
        <ul className="footer-badges"><li>Secure payments</li><li>Tracked delivery</li><li>7-day returns</li></ul>
      </div>
      <div role="navigation" aria-label="Shop" className="footer-col"><h3>Shop</h3>{shop.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</div>
      <div role="navigation" aria-label="Account" className="footer-col"><h3>Your account</h3>{account.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</div>
      <div role="navigation" aria-label="Help and policies" className="footer-col"><h3>Help &amp; policies</h3>{POLICIES.map((policy) => <Link key={policy.slug} href={`/policies/${policy.slug}`}>{policy.title}</Link>)}<Link href="/contact">Contact us</Link><CookieSettingsButton /></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span><span>Prices in INR · GST included where applicable</span></div>
  </footer>;
}
