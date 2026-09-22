// Same fix as the category page: without it, opening a different product kept showing the previous one
// until the new page finished loading.
export default function Loading() {
  return <section className="product-detail" aria-busy="true" aria-live="polite"><div className="gallery"><div className="main-image skeleton-block" /></div><div className="detail-copy"><p className="eyebrow">LOADING</p><h1 className="skeleton-line" /><div className="skeleton-block" style={{ height: 120 }} /></div></section>;
}
