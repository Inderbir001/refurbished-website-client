"use client";
import { useMemo, useState } from "react";
import { inr } from "@/lib/money";
import { OfferRow, salePriceFor } from "@/lib/services/offer-service";

type Option = { id: string; name: string };
const presets = [10, 20, 30, 40, 50];

export function OfferManager({ initialRows, categories, brands }: { initialRows: OfferRow[]; categories: Option[]; brands: Option[] }) {
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("");
  const [saleState, setSaleState] = useState("");
  const [bulkPercent, setBulkPercent] = useState("");
  const [rowPercent, setRowPercent] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const filtered = useMemo(() => rows.filter((row) => {
    if (search && !`${row.name} ${row.sku}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && row.categoryId !== category) return false;
    if (brand && row.brandId !== brand) return false;
    if (condition && row.condition !== condition) return false;
    if (saleState === "on" && row.percent === 0) return false;
    if (saleState === "off" && row.percent > 0) return false;
    return true;
  }), [rows, search, category, brand, condition, saleState]);

  const onSale = rows.filter((row) => row.percent > 0).length;
  const best = rows.reduce((max, row) => Math.max(max, row.percent), 0);
  const bulk = Number(bulkPercent);
  const bulkValid = Number.isInteger(bulk) && bulk >= 1 && bulk <= 90;
  const allFilteredSelected = filtered.length > 0 && filtered.every((row) => selected.has(row.id));

  async function send(body: Record<string, unknown>, done: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/offers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update prices.");
      setRows(result.data.rows);
      setMessage({ ok: true, text: `${done}${result.data.skipped ? ` ${result.data.skipped} product(s) skipped because the discounted price would be too low.` : ""}` });
      return true;
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not update prices." });
      return false;
    } finally { setBusy(false); }
  }

  async function applyBulk() {
    const productIds = [...selected];
    if (await send({ action: "APPLY_PERCENT", productIds, percent: bulk }, `${bulk}% off applied to ${productIds.length} product(s).`)) { setSelected(new Set()); setBulkPercent(""); }
  }
  async function clearBulk() {
    const productIds = [...selected];
    if (await send({ action: "CLEAR", productIds }, `Sale removed from ${productIds.length} product(s).`)) setSelected(new Set());
  }
  async function applyRow(row: OfferRow) {
    const percent = Number(rowPercent[row.id]);
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) { setMessage({ ok: false, text: "Enter a whole number between 1 and 90." }); return; }
    if (await send({ action: "APPLY_PERCENT", productIds: [row.id], percent }, `${row.name}: ${percent}% off.`)) setRowPercent((current) => ({ ...current, [row.id]: "" }));
  }
  function toggle(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function toggleAll() { setSelected((current) => { const next = new Set(current); if (allFilteredSelected) filtered.forEach((row) => next.delete(row.id)); else filtered.forEach((row) => next.add(row.id)); return next; }); }

  return <div className="offers-admin">
    <div className="offer-stats-admin">
      <article><span>Products on sale</span><b>{onSale} <small>of {rows.length}</small></b></article>
      <article><span>Biggest discount live</span><b>{best}%</b></article>
      <article><span>Selected</span><b>{selected.size}</b></article>
    </div>

    <div className="offer-filters">
      <input type="search" placeholder="Search product or SKU" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search products" />
      <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select value={brand} onChange={(event) => setBrand(event.target.value)} aria-label="Brand"><option value="">All brands</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select value={condition} onChange={(event) => setCondition(event.target.value)} aria-label="Condition"><option value="">Any condition</option><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="USED">Used</option></select>
      <select value={saleState} onChange={(event) => setSaleState(event.target.value)} aria-label="Sale status"><option value="">On sale or not</option><option value="on">On sale only</option><option value="off">Not on sale</option></select>
    </div>

    <div className="offer-bulk" aria-live="polite">
      <div><b>{selected.size ? `${selected.size} selected` : "Select products below"}</b><small>{selected.size ? "Set one discount for all of them." : "Tick rows, or use “Select all” to pick everything that matches the filters."}</small></div>
      <div className="offer-bulk-controls">
        <div className="offer-presets">{presets.map((value) => <button type="button" key={value} className={bulk === value ? "on" : ""} onClick={() => setBulkPercent(String(value))}>{value}%</button>)}</div>
        <label className="offer-percent"><input type="number" min={1} max={90} placeholder="%" value={bulkPercent} onChange={(event) => setBulkPercent(event.target.value)} aria-label="Discount percent" /><span>% off</span></label>
        <button type="button" className="primary-button" disabled={busy || !selected.size || !bulkValid} onClick={applyBulk}>{busy ? "Saving…" : "Apply discount"}</button>
        <button type="button" className="secondary-button" disabled={busy || !selected.size} onClick={clearBulk}>Remove sale</button>
      </div>
    </div>
    {message && <p className={message.ok ? "offer-msg ok" : "offer-msg bad"} role="status">{message.text}</p>}

    <div className="offer-table-wrap">
      <table className="offer-table">
        <thead><tr><th><input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label="Select all shown" /></th><th>Product</th><th>Regular</th><th>Price now</th><th>Discount</th><th>Set discount</th></tr></thead>
        <tbody>{filtered.map((row) => {
          const preview = selected.has(row.id) && bulkValid ? salePriceFor(row.original, bulk) : null;
          return <tr key={row.id} className={selected.has(row.id) ? "picked" : ""}>
            <td><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} aria-label={`Select ${row.name}`} /></td>
            <td><div className="offer-product">{row.image ? <img src={row.image} alt="" /> : <span />}<div><b>{row.name}</b><small>{row.category} · {row.brand}{row.status !== "ACTIVE" ? ` · ${row.status.toLowerCase()}` : ""}</small></div></div></td>
            <td>{row.percent > 0 ? <del>{inr(row.original)}</del> : inr(row.original)}</td>
            <td><b>{inr(row.price)}</b>{preview !== null && <span className="offer-preview">→ {inr(preview)}</span>}</td>
            <td>{row.percent > 0 ? <span className="pct-badge">{row.percent}% off</span> : <span className="muted">—</span>}</td>
            <td><div className="offer-row-set"><input type="number" min={1} max={90} placeholder="%" value={rowPercent[row.id] ?? ""} onChange={(event) => setRowPercent((current) => ({ ...current, [row.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") void applyRow(row); }} aria-label={`Discount for ${row.name}`} /><button type="button" disabled={busy} onClick={() => applyRow(row)}>Set</button>{row.percent > 0 && <button type="button" className="ghost" disabled={busy} onClick={() => send({ action: "CLEAR", productIds: [row.id] }, `Sale removed from ${row.name}.`)}>Remove</button>}</div></td>
          </tr>;
        })}</tbody>
      </table>
      {!filtered.length && <p className="offer-empty">No products match these filters.</p>}
    </div>
  </div>;
}
