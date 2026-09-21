import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/store/product-card";
import { pageData } from "@/lib/page-data";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { category } = await pageData("category", { slug: (await params).slug }); return category ? { title: category.seoTitle ?? category.name, description: category.seoDescription ?? category.description, alternates: { canonical: `/category/${category.slug}` } } : { title: "Category not found" }; }
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { const slug = (await params).slug; const { category, products } = await pageData("category", { slug }); if (!category) notFound(); return <section className="section"><p className="eyebrow">CATEGORY</p><h1>{category.name}</h1>{category.description && <p>{category.description}</p>}{products.length ? <div className="product-grid" data-reveal-group>{products.map((product) => <ProductCard product={product} key={product.id}/>)}</div> : <div className="empty-state"><h3>No products in this category yet</h3></div>}</section>; }
