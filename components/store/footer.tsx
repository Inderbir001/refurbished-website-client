import Link from "next/link";
import { brand } from "@/lib/brand";
import { Wordmark } from "@/components/store/wordmark";

const shop = [["Shop all", "/products"], ["Top deals", "/products?sort=price-asc"], ["Certified refurbished", "/products?condition=REFURBISHED"], ["Pre-owned", "/products?condition=USED"]];
const account = [["Sign in", "/login"], ["Create account", "/register"], ["My orders", "/account/orders"], ["Cart", "/cart"]];

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-grid">
      <div className="footer-brand">
        <Link href="/" className="wordmark"><Wordmark /></Link>
        <p>{brand.tagline}. Better devices, honest condition grades and warranty on every order.</p>
        <ul className="footer-badges"><li>Secure payments</li><li>Tracked delivery</li><li>7-day returns</li></ul>
      </div>
      <div role="navigation" aria-label="Shop" className="footer-col"><h3>Shop</h3>{shop.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</div>
      <div role="navigation" aria-label="Account" className="footer-col"><h3>Your account</h3>{account.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</div>
      <div className="footer-trust"><h3>Our promise</h3><p>Every certified refurbished phone is tested and graded before it ships, with a warranty you can see on the product page.</p></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span><span>Prices in INR · GST included where applicable</span></div>
  </footer>;
}
