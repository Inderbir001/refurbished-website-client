"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type MenuCategory = { id: string; name: string; slug: string; count: number };

export function CategoryMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <div className="all-cats" ref={root}>
      <button type="button" className="all-cats-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        <span>All categories</span>
      </button>
      {open && (
        <div className="all-cats-panel">
          {categories.map((category) => <Link key={category.id} href={`/category/${category.slug}`} onClick={() => setOpen(false)}><b>{category.name}</b><small>{category.count} products</small></Link>)}
          <Link href="/products" className="all-cats-all" onClick={() => setOpen(false)}>Browse the full catalog →</Link>
        </div>
      )}
    </div>
  );
}
