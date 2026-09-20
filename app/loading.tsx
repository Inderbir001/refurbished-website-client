import { brand } from "@/lib/brand";
export default function Loading() {
  return <section className="page-shell" aria-busy="true" aria-live="polite"><p className="eyebrow">{brand.name.toUpperCase()}</p><h1>Loading…</h1><div className="skeleton-grid">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div></section>;
}
