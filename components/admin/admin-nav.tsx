"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/store/wordmark";

const groups: { label: string; links: [string, string][] }[] = [
  { label: "Home", links: [["/admin", "Dashboard"]] },
  { label: "Sell more", links: [["/admin/offers", "Sales & coupons"], ["/admin/storefront", "Homepage"]] },
  { label: "Catalog", links: [["/admin/products", "Products"], ["/admin/categories", "Categories"], ["/admin/brands", "Brands"], ["/admin/collections", "Collections"], ["/admin/inventory", "Stock"]] },
  { label: "Orders", links: [["/admin/orders", "Orders"], ["/admin/payments", "Payments"], ["/admin/shipping", "Delivery"], ["/admin/reviews", "Reviews"]] },
  { label: "People", links: [["/admin/customers", "Customers"], ["/admin/users", "Team & roles"]] },
  { label: "Store", links: [["/admin/analytics", "Reports"], ["/admin/tax", "GST & tax"], ["/admin/settings", "Settings"], ["/admin/media", "Images"], ["/admin/audit-logs", "Activity log"]] },
];

export function AdminNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));
  return (
    <aside className="admin-side" aria-label="Admin menu">
      <Link href="/" className="wordmark admin-brand"><Wordmark /></Link>
      <div className="admin-groups">
        {groups.map((group) => (
          <div className="admin-group" key={group.label}>
            <p>{group.label}</p>
            {group.links.map(([href, label]) => <Link key={href} href={href} className={active(href) ? "on" : ""} aria-current={active(href) ? "page" : undefined}>{label}</Link>)}
          </div>
        ))}
      </div>
      <Link href="/" target="_blank" className="admin-viewstore">View your store ↗</Link>
    </aside>
  );
}
