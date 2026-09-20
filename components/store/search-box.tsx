"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { brand } from "@/lib/brand";

type Suggestion = { label: string; type: string; href: string };
const recentKey = `${brand.fileSlug}_recent_searches`;

export function SearchBox({ defaultValue = "", variant = "page" }: { defaultValue?: string; variant?: "page" | "header" }) {
  const params = useSearchParams();
  const urlQuery = variant === "header" ? params.get("q") ?? "" : defaultValue;
  const [query, setQuery] = useState(urlQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setQuery(urlQuery); }, [urlQuery]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(recentKey) ?? "[]")); } catch { setRecent([]); }
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal }).then((response) => response.json()).then((result) => setSuggestions(result.data?.suggestions ?? [])).catch(() => undefined), 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open]);

  function submit() {
    const value = query.trim();
    if (!value) return;
    const next = [value, ...recent.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 6);
    try { localStorage.setItem(recentKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
    setRecent(next);
    setOpen(false);
    fetch("/api/search/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: value }) }).catch(() => undefined);
  }

  const showRecent = !query.trim() && recent.length > 0;
  const showPanel = open && (suggestions.length > 0 || showRecent);
  return (
    <div className={variant === "header" ? "search-box header-search" : "search-box"} onFocus={() => setOpen(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <form action="/products" role="search" onSubmit={submit}>
        <input name="q" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for phones, earbuds, chargers, brands and more" aria-label="Search products" autoComplete="off" />
        <button aria-label="Search">
          {variant === "header" ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg> : "Search"}
        </button>
      </form>
      {showPanel && (
        <div className="search-suggestions" onMouseDown={(event) => event.preventDefault()}>
          {showRecent && recent.map((item) => <Link key={item} href={`/products?q=${encodeURIComponent(item)}`} onClick={() => setOpen(false)}><small>Recent</small>{item}</Link>)}
          {suggestions.map((item) => <Link key={`${item.type}:${item.href}`} href={item.href} onClick={() => setOpen(false)}><small>{item.type}</small>{item.label}</Link>)}
        </div>
      )}
    </div>
  );
}
