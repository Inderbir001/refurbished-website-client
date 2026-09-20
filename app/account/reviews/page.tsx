import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/store/account-nav";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function ReviewsPage() { const session = await currentSession(); if (!session) redirect("/login"); const reviews = await db.review.findMany({ where: { userId: session.sub }, include: { product: true }, orderBy: { updatedAt: "desc" } }); return <section className="page-shell"><AccountNav/><p className="eyebrow">MY REVIEWS</p><h1>Reviews</h1><div className="account-list">{reviews.length ? reviews.map((review) => <article key={review.id}><Link href={`/products/${review.product.slug}`}><b>{review.product.name}</b></Link><span>{"★".repeat(review.rating)}</span><span>{review.isVisible ? "Published" : "In moderation"}</span><p>{review.body}</p></article>) : <div className="empty-state"><h3>No reviews yet</h3><p>After a delivered purchase, review the product from its product page.</p></div>}</div></section>; }
