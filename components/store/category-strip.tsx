"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type Item = { id: string; name: string; slug: string };

// The scrolling category row. It marks the page you are on (a category, or "Refurbished deals") instead of
// always highlighting one link, and scrolls the current one into view on small screens.
export function CategoryStrip({ categories }: { categories: Item[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const box = useRef<HTMLDivElement>(null);
  const onRefurbished = pathname === "/products" && params.get("condition") === "REFURBISHED";
  const currentCategory = pathname.startsWith("/category/") ? decodeURIComponent(pathname.slice("/category/".length).split("/")[0]) : pathname === "/products" ? params.get("category") : null;

  useEffect(() => {
    const current = box.current?.querySelector<HTMLElement>("a.on");
    const strip = box.current;
    if (!current || !strip) return;
    strip.scrollTo({ left: Math.max(0, current.offsetLeft - strip.clientWidth / 2 + current.clientWidth / 2), behavior: "smooth" });
  }, [pathname, onRefurbished, currentCategory]);

  return (
    <div className="cat-scroll" ref={box}>
      <Link href="/products?condition=REFURBISHED" className={onRefurbished ? "cat-deals on" : "cat-deals"} aria-current={onRefurbished ? "page" : undefined}><i aria-hidden="true" />Refurbished deals</Link>
      {categories.map((category) => {
        const active = currentCategory === category.slug;
        return <Link key={category.id} href={`/category/${category.slug}`} className={active ? "on" : ""} aria-current={active ? "page" : undefined}>{category.name}</Link>;
      })}
    </div>
  );
}
