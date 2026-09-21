"use client";
import { useState } from "react";

type Option = { id: string; name: string };

// Pick products for a collection: search, tick, and see how many are chosen. The choices travel with the form
// as hidden "productIds" fields, so it works the same as the plain multi-select it replaces.
export function ProductPicker({ products, selected = [], name = "productIds" }: { products: Option[]; selected?: string[]; name?: string }) {
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(selected));
  const [query, setQuery] = useState("");
  const [onlyChosen, setOnlyChosen] = useState(false);
  const needle = query.trim().toLowerCase();
  const shown = products.filter((item) => (!needle || item.name.toLowerCase().includes(needle)) && (!onlyChosen || chosen.has(item.id)));
  const toggle = (id: string) => setChosen((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <div className="picker">
    <div className="picker-head">
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} placeholder="Search products…" aria-label="Search products" />
      <button type="button" className={onlyChosen ? "on" : ""} aria-pressed={onlyChosen} onClick={() => setOnlyChosen((value) => !value)}>Selected only</button>
      <button type="button" onClick={() => setChosen(new Set())} disabled={!chosen.size}>Clear all</button>
    </div>
    <div className="picker-list" role="group" aria-label="Products">
      {shown.map((item) => <label key={item.id}><input type="checkbox" checked={chosen.has(item.id)} onChange={() => toggle(item.id)} />{item.name}</label>)}
      {!shown.length && <p className="picker-count">No products match.</p>}
    </div>
    {[...chosen].map((id) => <input key={id} type="hidden" name={name} value={id} />)}
    <span className="picker-count">{chosen.size} {chosen.size === 1 ? "product" : "products"} selected</span>
  </div>;
}
