import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { ProductEditor } from "@/components/admin/product-editor";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function AdminProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const session = await currentSession();
  const allowed: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  const id = (await params).id;
  const created = (await searchParams).created === "1";
  const [product, categories, brands] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { variants: { orderBy: { createdAt: "asc" } }, images: { orderBy: { position: "asc" } } } }),
    db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();
  const value = {
    ...product, specifications: (product.specifications ?? {}) as Record<string, string>, dimensions: (product.dimensions ?? {}) as Record<string, string>,
    variants: product.variants.map((variant) => ({ ...variant, barcode: variant.barcode ?? "", attributes: (variant.attributes ?? {}) as Record<string, string> })),
    images: product.images.map(({ url, alt, position }) => ({ url, alt, position })),
  };
  return <section className="adm-page">
    <div><Link className="adm-back" href="/admin/products">← Products</Link></div>
    <div className="adm-head"><div><p className="adm-eyebrow">Edit product</p><h1>{product.name}</h1></div><a className="adm-btn small ghost" href={`/products/${product.slug}`} target="_blank" rel="noreferrer">View in shop ↗</a></div>
    <ProductEditor product={value} categories={categories} brands={brands} created={created} />
  </section>;
}
