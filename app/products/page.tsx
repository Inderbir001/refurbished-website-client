import { ProductCard } from "@/components/store/product-card";
import { listProducts, ProductFilters } from "@/lib/catalog";
import { db } from "@/lib/db";
import { FiltersToggle } from "@/components/store/filters-toggle";

import type { Metadata } from "next";
export const dynamic = "force-dynamic";
type Search = { q?: string; category?: string; brand?: string; condition?: string; min?: string; max?: string; availability?: string; storage?: string; ram?: string; color?: string; rating?: string; sort?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const params = await searchParams;
  if (params.q) return { title: `Results for “${params.q.slice(0, 60)}”`, robots: { index: false, follow: true } };
  if (params.condition === "REFURBISHED") return { title: "Refurbished deals", description: "Certified refurbished phones and electronics with warranty." };
  if (params.condition === "USED") return { title: "Pre-owned devices", description: "Tested and graded pre-owned phones and electronics." };
  return { title: "All products", description: "Browse new, certified refurbished and pre-owned phones and electronics." };
}

export default async function Products({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const condition = params.condition === "NEW" || params.condition === "REFURBISHED" || params.condition === "USED" ? params.condition : undefined;
  const filters: ProductFilters = { q: params.q, category: params.category, brand: params.brand, condition, min: params.min ? Number(params.min) * 100 : undefined, max: params.max ? Number(params.max) * 100 : undefined, availability: params.availability === "in-stock", storage: params.storage, ram: params.ram, color: params.color, rating: params.rating ? Number(params.rating) : undefined, sort: params.sort };
  const [products, categories, brands] = await Promise.all([listProducts(filters), db.category.findMany({ where: { isVisible: true, products: { some: { status: "ACTIVE" } } }, orderBy: { position: "asc" } }), db.brand.findMany({ where: { isActive: true, products: { some: { status: "ACTIVE" } } }, orderBy: { name: "asc" } })]);
  return <section className="listing"><div className="listing-heading"><p className="eyebrow">CATALOG</p><h1>{params.q ? `Results for “${params.q}”` : "Find your next device"}</h1></div><FiltersToggle /><aside className="filters"><b>Refine results</b><form className="filter-form"><label>Category<select name="category" defaultValue={params.category ?? ""}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label><label>Brand<select name="brand" defaultValue={params.brand ?? ""}><option value="">All brands</option>{brands.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label><label>Condition<select name="condition" defaultValue={condition ?? ""}><option value="">Any condition</option><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="USED">Used</option></select></label><div className="price-filter"><input name="min" type="number" placeholder="Min ₹" defaultValue={params.min}/><input name="max" type="number" placeholder="Max ₹" defaultValue={params.max}/></div><label>Storage<input name="storage" placeholder="128GB" defaultValue={params.storage}/></label><label>RAM<input name="ram" placeholder="8GB" defaultValue={params.ram}/></label><label>Color<input name="color" placeholder="Black" defaultValue={params.color}/></label><label>Minimum rating<select name="rating" defaultValue={params.rating ?? ""}><option value="">Any rating</option><option value="4">4★ & up</option><option value="3">3★ & up</option></select></label><label>Sort<select name="sort" defaultValue={params.sort ?? "newest"}><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="popular">Popularity</option><option value="rating">Rating</option></select></label><label><input type="checkbox" name="availability" value="in-stock" defaultChecked={params.availability === "in-stock"} /> In stock only</label>{params.q && <input type="hidden" name="q" value={params.q} />}<button>Apply filters</button></form></aside><div className="listing-content"><p className="count">{products.length} products</p>{products.length ? <div className="product-grid" data-reveal-group>{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>No products found</h3><p>Try removing a filter or searching for another device.</p></div>}</div></section>;
}
