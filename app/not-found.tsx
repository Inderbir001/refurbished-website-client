import Link from "next/link";

export default function NotFound() {
  return <section className="page-shell" style={{ textAlign: "center", padding: "90px 22px" }}>
    <p className="eyebrow">ERROR 404</p>
    <h1>We could not find that page.</h1>
    <p>It may have moved, or the product may no longer be available.</p>
    <p style={{ marginTop: 22, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
      <Link className="primary-button" href="/products">Browse all products</Link>
      <Link className="secondary-button" href="/">Go to home</Link>
    </p>
  </section>;
}
