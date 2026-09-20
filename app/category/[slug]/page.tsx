import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/store/product-card";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const category = await db.category.findFirst({ where: { slug: (await params).slug, isVisible: true } }); return category ? { title: category.seoTitle ?? category.name, description: category.seoDescription ?? category.description, alternates: { canonical: `/category/${category.slug}` } } : { title: "Category not found" }; }
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { const slug = (await params).slug; const [category, products] = await Promise.all([db.category.findFirst({ where: { slug, isVisible: true } }), listProducts({ category: slug })]); if (!category) notFound(); return <section className="section"><p className="eyebrow">CATEGORY</p><h1>{category.name}</h1>{category.description && <p>{category.description}</p>}{products.length ? <div className="product-grid">{products.map((product) => <ProductCard product={product} key={product.id}/>)}</div> : <div className="empty-state"><h3>No products in this category yet</h3></div>}</section>; }
