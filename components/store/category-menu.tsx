"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MenuCategory = { id: string; name: string; slug: string; count: number };

export function CategoryMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const sync = () => setPhone(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Desktop dropdown: close on outside click or Escape.
  useEffect(() => {
    if (!open || phone) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open, phone]);

  // Phone bottom sheet: freeze the page behind it while it is open.
  useEffect(() => {
    if (!open || !phone) return;
    document.documentElement.classList.add("no-scroll");
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.documentElement.classList.remove("no-scroll"); document.removeEventListener("keydown", onKey); };
  }, [open, phone]);

  const links = <>
    {categories.map((category) => <Link key={category.id} href={`/category/${category.slug}`} onClick={() => setOpen(false)}><b>{category.name}</b><small>{category.count} {category.count === 1 ? "product" : "products"}</small></Link>)}
    <Link href="/products" className="all-cats-all" onClick={() => setOpen(false)}>Browse the full catalog →</Link>
  </>;

  return (
    <div className="all-cats" ref={root}>
      <button type="button" className="all-cats-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        <span>All categories</span>
      </button>
      {open && !phone && <div className="all-cats-panel">{links}</div>}
      {/* Rendered into <body>: the frosted-glass header would otherwise trap a fixed-position sheet inside itself. */}
      {open && phone && createPortal(
        <>
          <div className="all-cats-backdrop" onClick={() => setOpen(false)} />
          <div className="all-cats-sheet" role="dialog" aria-modal="true" aria-label="All categories">
            <div className="sheet-head"><b>All categories</b><button type="button" onClick={() => setOpen(false)} aria-label="Close">✕</button></div>
            <div className="sheet-links">{links}</div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
