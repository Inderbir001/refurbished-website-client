import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { NewProductForm } from "@/components/admin/new-product-form";
import { CatalogTools } from "@/components/admin/catalog-tools";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const session = await currentSession();
  const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER];
  if (!session || !allowedRoles.includes(session.role)) redirect("/login");
  const store = await db.store.findFirst();
  if (!store) return <section className="page-shell"><h1>Store setup is incomplete</h1><p>Run the seed command or create a store record before publishing products.</p></section>;
  const [categories, brands, products] = await Promise.all([
    db.category.findMany({ where: { storeId: store.id }, select: { id: true, name: true } }),
    db.brand.findMany({ where: { storeId: store.id }, select: { id: true, name: true } }),
    db.product.findMany({ take: 20, orderBy: { updatedAt: "desc" }, include: { variants: true } }),
  ]);
  return <section className="admin-page"><Link href="/admin" className="text-link">← Dashboard</Link><p className="eyebrow">CATALOG</p><h1>Products</h1><div className="admin-panel"><CatalogTools /></div><div className="admin-two-col"><div className="admin-panel"><h2>Publish a product</h2><NewProductForm storeId={store.id} categories={categories} brands={brands} /></div><div className="admin-panel"><h2>Catalog</h2>{products.map((product) => <Link className="admin-product" href={`/admin/products/${product.id}`} key={product.id}><div><b>{product.name}</b><small>{product.sku} · {product.status}</small></div><span>{product.variants.reduce((total, item) => total + item.stock, 0)} in stock →</span></Link>)}</div></div></section>;
}
