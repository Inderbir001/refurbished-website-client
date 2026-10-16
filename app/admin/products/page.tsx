import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma, ProductStatus, Role } from "@prisma/client";
import { CatalogTools } from "@/components/admin/catalog-tools";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { likeEscape } from "@/lib/catalog";
import { inr } from "@/lib/money";

export const dynamic = "force-dynamic";
const PER_PAGE = 25;
const FILTERS: [string, string][] = [["all", "All"], ["ACTIVE", "Live"], ["DRAFT", "Drafts"], ["ARCHIVED", "Removed"]];
const pill: Record<string, [string, string]> = { ACTIVE: ["ok", "Live"], DRAFT: ["warn", "Draft"], ARCHIVED: ["muted", "Removed"] };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const status = FILTERS.some(([value]) => value === params.status) && params.status !== "all" ? (params.status as ProductStatus) : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const session = await currentSession();
  const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER];
  if (!session || !allowedRoles.includes(session.role)) redirect("/login");
  const store = await db.store.findFirst();
  if (!store) return <section className="adm-page"><h1>Store setup is incomplete</h1><p>Run the seed command or create a store record before adding products.</p></section>;

  const where: Prisma.ProductWhereInput = { deletedAt: null, ...(status ? { status } : {}), ...(q ? { OR: [{ name: { contains: likeEscape(q), mode: "insensitive" } }, { sku: { contains: likeEscape(q), mode: "insensitive" } }] } : {}) };
  const [products, total, groups] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { variants: { select: { stock: true } }, images: { orderBy: { position: "asc" }, take: 1 }, category: { select: { name: true } } } }),
    db.product.count({ where }),
    db.product.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
  ]);
  const count = (value: string) => (value === "all" ? groups.reduce((sum, group) => sum + group._count, 0) : groups.find((group) => group.status === value)?._count ?? 0);
  const link = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | undefined> = { q, status: params.status, page: undefined, ...patch };
    for (const [key, value] of Object.entries(merged)) if (value && value !== "all") next.set(key, value);
    const text = next.toString();
    return `/admin/products${text ? `?${text}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return <section className="adm-page">
    <div className="adm-head">
      <div><p className="adm-eyebrow">Catalog</p><h1>Products</h1><p>Everything you sell. Click a product to edit its photos, price and stock.</p></div>
      <Link className="adm-btn primary" href="/admin/products/new">+ Add product</Link>
    </div>

    <div className="adm-toolbar">
      <form className="adm-search" role="search"><input name="q" defaultValue={q} placeholder="Search by name or SKU" aria-label="Search products" />{status && <input type="hidden" name="status" value={status} />}<button className="adm-btn small">Search</button>{q && <Link className="adm-btn small ghost" href={link({ q: undefined })}>Clear</Link>}</form>
      <div className="adm-chips">{FILTERS.map(([value, label]) => <Link key={value} href={link({ status: value })} className={(params.status ?? "all") === value ? "on" : ""}>{label} ({count(value)})</Link>)}</div>
    </div>

    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>Product</th><th>Category</th><th className="r">Price</th><th className="r">Stock</th><th>Status</th><th /></tr></thead>
        <tbody>
          {products.map((product) => {
            const stock = product.variants.reduce((sum, item) => sum + item.stock, 0);
            const [tone, label] = pill[product.status] ?? ["muted", product.status];
            return <tr key={product.id}>
              <td><Link className="adm-prod" href={`/admin/products/${product.id}`}>{product.images[0] ? <img src={product.images[0].url} alt="" /> : <span className="ph">▢</span>}<div><b>{product.name}</b><small>{product.sku}</small></div></Link></td>
              <td>{product.category?.name ?? <span className="adm-hint">None</span>}</td>
              <td className="r">{inr(product.salePrice ?? product.basePrice)}{product.salePrice != null && <><br /><small className="adm-hint"><del>{inr(product.basePrice)}</del></small></>}</td>
              <td className="r"><span className={`adm-stock-n ${stock <= 0 ? "out" : ""}`}>{stock}</span></td>
              <td><span className={`adm-pill ${tone}`}>{label}</span></td>
              <td className="r"><Link className="adm-btn small ghost" href={`/admin/products/${product.id}`}>Edit</Link></td>
            </tr>;
          })}
          {!products.length && <tr><td colSpan={6}><div className="adm-empty"><b>No products found</b>{q || status ? "Try a different search or filter." : "Add your first product to get started."}</div></td></tr>}
        </tbody>
      </table>
    </div>
    {pages > 1 && <div className="adm-paging"><span>Page {page} of {pages} · {total} products</span><span style={{ display: "flex", gap: 8 }}>{page > 1 && <Link className="adm-btn small ghost" href={link({ page: String(page - 1) })}>← Previous</Link>}{page < pages && <Link className="adm-btn small ghost" href={link({ page: String(page + 1) })}>Next →</Link>}</span></div>}

    <section className="adm-card"><details><summary>Import and export in bulk</summary><CatalogTools /></details></section>
  </section>;
}
