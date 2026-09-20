import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { OfferManager } from "@/components/admin/offer-manager";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadOfferRows } from "@/lib/services/offer-rows";

export const dynamic = "force-dynamic";

export default async function AdminOffers() {
  const session = await currentSession();
  const allowed: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  const now = new Date();
  const [rows, categories, brands, activeCoupons, hero] = await Promise.all([
    loadOfferRows(),
    db.category.findMany({ where: { products: { some: { deletedAt: null } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { products: { some: { deletedAt: null } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.coupon.count({ where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    db.homepageSection.findFirst({ where: { type: "HERO" } }),
  ]);
  return <section className="admin-page">
    <Link href="/admin" className="text-link">← Dashboard</Link>
    <p className="eyebrow">MARKETING</p>
    <h1>Offers &amp; deals</h1>
    <p className="offers-intro">Everything the homepage shows as a deal comes from here. Give a product a discount and it appears on the storefront straight away — in <b>Top deals</b>, the offer tiles, the hero “Up to X% off” and the category and brand offers. Remove the discount and it disappears.</p>
    <div className="offers-links">
      <Link href="/admin/coupons"><b>Coupon codes</b><span>{activeCoupons} active · create, pause or resume codes</span></Link>
      <Link href="/admin/storefront"><b>Homepage</b><span>{hero?.isVisible === false ? "Hero hidden · " : ""}Edit hero text, banners, section order</span></Link>
    </div>
    <div className="admin-panel"><OfferManager initialRows={rows} categories={categories} brands={brands} /></div>
  </section>;
}
