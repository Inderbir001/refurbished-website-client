import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { NewProductForm } from "@/components/admin/new-product-form";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function NewProduct() {
  const session = await currentSession();
  const allowed: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  const store = await db.store.findFirst();
  if (!store) return <section className="adm-page"><h1>Store setup is incomplete</h1></section>;
  const [categories, brands] = await Promise.all([
    db.category.findMany({ where: { storeId: store.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { storeId: store.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <section className="adm-page">
    <div><Link className="adm-back" href="/admin/products">← Products</Link></div>
    <div className="adm-head"><div><p className="adm-eyebrow">Catalog</p><h1>Add a product</h1><p>Fill in the essentials and publish. You can add specifications and options (colours, storage) afterwards.</p></div></div>
    <NewProductForm storeId={store.id} categories={categories} brands={brands} />
  </section>;
}
