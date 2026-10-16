"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { safeFetch } from "@/lib/safe-fetch";

export type StockRow = { id: string; productId: string; product: string; variant: string; sku: string; stock: number; low: number; image: string | null };
type Filter = "all" | "low" | "out";
const PAGE = 50;

// Admin → Stock: one searchable list. Change a number, press Save. Nothing to open, nothing to explain.
export function StockManager({ rows }: { rows: StockRow[] }) {
  const [items, setItems] = useState(rows);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);

  const counts = useMemo(() => ({ all: items.length, low: items.filter((row) => row.stock > 0 && row.stock <= row.low).length, out: items.filter((row) => row.stock <= 0).length }), [items]);
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return items.filter((row) => (filter === "all" || (filter === "out" ? row.stock <= 0 : row.stock > 0 && row.stock <= row.low)) && (!text || `${row.product} ${row.variant} ${row.sku}`.toLowerCase().includes(text)));
  }, [items, query, filter]);

  async function save(row: StockRow) {
    const next = draft[row.id];
    if (next === undefined || next === row.stock) return;
    setBusy(row.id); setFlash(null);
    const response = await safeFetch("/api/admin/inventory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ variantId: row.id, delta: next - row.stock, note: "Stock updated from the Stock page" }) });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) return setFlash({ id: row.id, ok: false, text: result.error ?? "That could not be saved." });
    setItems((current) => current.map((item) => (item.id === row.id ? { ...item, stock: next } : item)));
    setDraft((current) => { const copy = { ...current }; delete copy[row.id]; return copy; });
    setFlash({ id: row.id, ok: true, text: "Saved" });
  }
  const set = (id: string, value: number) => setDraft((current) => ({ ...current, [id]: Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)) }));

  return <>
    <div className="adm-toolbar">
      <div className="adm-search"><input value={query} onChange={(event) => { setQuery(event.target.value); setShown(PAGE); }} placeholder="Search by product name or SKU" aria-label="Search stock" /></div>
      <div className="adm-chips" role="group" aria-label="Filter">{([["all", `All (${counts.all})`], ["low", `Low stock (${counts.low})`], ["out", `Out of stock (${counts.out})`]] as const).map(([value, label]) => <button key={value} type="button" className={filter === value ? "on" : ""} onClick={() => { setFilter(value); setShown(PAGE); }}>{label}</button>)}</div>
      <a className="adm-btn small ghost" href="/api/admin/inventory/export">Download as CSV</a>
    </div>

    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>Product</th><th>SKU</th><th className="r">In stock</th><th>Change to</th></tr></thead>
        <tbody>
          {visible.slice(0, shown).map((row) => {
            const value = draft[row.id] ?? row.stock;
            const dirty = draft[row.id] !== undefined && draft[row.id] !== row.stock;
            const state = row.stock <= 0 ? "out" : row.stock <= row.low ? "low" : "";
            return <tr key={row.id}>
              <td><div className="adm-prod">{row.image ? <img src={row.image} alt="" /> : <span className="ph">▢</span>}<div><b><Link href={`/admin/products/${row.productId}`}>{row.product}</Link></b>{row.variant !== "Standard" && <small>{row.variant}</small>}</div></div></td>
              <td><small>{row.sku}</small></td>
              <td className="r"><span className={`adm-stock-n ${state}`}>{row.stock}</span>{state === "out" && <><br /><span className="adm-pill bad">Out of stock</span></>}{state === "low" && <><br /><span className="adm-pill warn">Low</span></>}</td>
              <td>
                <div className="adm-qty">
                  <button type="button" className="step" aria-label="One less" onClick={() => set(row.id, value - 1)}>−</button>
                  <input type="number" min="0" value={value} aria-label={`Stock for ${row.product}`} onChange={(event) => set(row.id, Number(event.target.value))} onKeyDown={(event) => { if (event.key === "Enter") void save(row); }} />
                  <button type="button" className="step" aria-label="One more" onClick={() => set(row.id, value + 1)}>+</button>
                  <button type="button" className="adm-btn small primary" disabled={!dirty || busy === row.id} onClick={() => save(row)}>{busy === row.id ? "Saving…" : "Save"}</button>
                  {flash?.id === row.id && <span className={`msg ${flash.ok ? "ok" : "bad"}`} style={{ fontSize: 12, fontWeight: 700, color: flash.ok ? "#0f5d3a" : "#b3351b" }}>{flash.text}</span>}
                </div>
              </td>
            </tr>;
          })}
          {!visible.length && <tr><td colSpan={4}><div className="adm-empty"><b>Nothing found</b>Try a different search or filter.</div></td></tr>}
        </tbody>
      </table>
    </div>
    {visible.length > shown && <div className="adm-paging"><span>Showing {shown} of {visible.length}</span><button type="button" className="adm-btn small ghost" onClick={() => setShown((count) => count + PAGE)}>Show more</button></div>}
  </>;
}
