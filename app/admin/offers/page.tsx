import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { CouponStudio, CouponRow } from "@/components/admin/coupon-studio";
import { OfferManager } from "@/components/admin/offer-manager";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadOfferRows } from "@/lib/services/offer-rows";

export const dynamic = "force-dynamic";

export default async function AdminOffers() {
  const session = await currentSession();
  const allowed: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  const canCoupons = session.role === Role.SUPER_ADMIN || session.role === Role.ADMIN;

  const [rows, categories, brands, coupons] = await Promise.all([
    loadOfferRows(),
    db.category.findMany({ where: { products: { some: { deletedAt: null } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { products: { some: { deletedAt: null } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    canCoupons ? db.coupon.findMany({ orderBy: { createdAt: "desc" }, take: 50 }) : Promise.resolve([]),
  ]);
  const couponRows: CouponRow[] = coupons.map((coupon) => ({ id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, minimumOrder: coupon.minimumOrder, maximumDiscount: coupon.maximumDiscount, expiresAt: coupon.expiresAt?.toISOString() ?? null, isActive: coupon.isActive, usedCount: coupon.usedCount, usageLimit: coupon.usageLimit, firstOrderOnly: coupon.firstOrderOnly, scopeType: coupon.scopeType }));

  return <section className="admin-page">
    <p className="eyebrow">SELL MORE</p>
    <h1>Sales &amp; coupons</h1>
    <p className="offers-intro">Discounts you set here appear on your store right away — in <b>Top deals</b>, the offer tiles and the “Up to X% off” banner. End a sale and the regular price comes back.</p>
    <OfferManager initialRows={rows} categories={categories} brands={brands} />
    {canCoupons ? <CouponStudio initial={couponRows} /> : <p className="step-hint">Coupon codes are managed by an Admin.</p>}
    <p className="offers-foot">Want to change the homepage banner or the order of sections? <Link href="/admin/storefront">Edit the homepage →</Link></p>
  </section>;
}
