// Without this, clicking a different category kept showing the previous category's products until the new
// page finished loading — a confusing flash of stale content. This shows a skeleton in the meantime instead.
export default function Loading() {
  return <section className="section" aria-busy="true" aria-live="polite"><p className="eyebrow">CATEGORY</p><h1 className="skeleton-line" /><div className="product-grid skeleton-grid">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div></section>;
}
