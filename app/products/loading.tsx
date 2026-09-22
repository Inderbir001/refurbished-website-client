// Same fix, for the "all products" listing (e.g. switching Shop all filters or the search).
import { brand } from "@/lib/brand";
export default function Loading() {
  return <section className="listing" aria-busy="true" aria-live="polite"><div className="listing-heading"><p className="eyebrow">{brand.name.toUpperCase()}</p><h1>Loading…</h1></div><div className="product-grid skeleton-grid">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div></section>;
}
