"use client";
import { useMemo, useState } from "react";
import { inr } from "@/lib/money";
import { OfferRow, salePriceFor } from "@/lib/services/offer-service";

type Option = { id: string; name: string };
type Scope = "all" | "category" | "brand" | "condition" | "pick";
type Note = { ok: boolean; text: string } | null;
const presets = [10, 15, 20, 25, 30, 40, 50];
const conditions: [string, string][] = [["NEW", "Brand new"], ["REFURBISHED", "Refurbished"], ["USED", "Pre-owned"]];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function OfferManager({ initialRows, categories, brands }: { initialRows: OfferRow[]; categories: Option[]; brands: Option[] }) {
  const [rows, setRows] = useState(initialRows);
  const [scope, setScope] = useState<Scope>("all");
  const [scopeValue, setScopeValue] = useState("");
  const [percent, setPercent] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  // fine-tune table
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [saleState, setSaleState] = useState("");
  const [rowPercent, setRowPercent] = useState<Record<string, string>>({});

  const pct = Number(percent);
  const pctValid = Number.isInteger(pct) && pct >= 1 && pct <= 90;

  const targets = useMemo(() => rows.filter((row) => {
    if (scope === "all") return true;
    if (scope === "category") return Boolean(scopeValue) && row.categoryId === scopeValue;
    if (scope === "brand") return Boolean(scopeValue) && row.brandId === scopeValue;
    if (scope === "condition") return Boolean(scopeValue) && row.condition === scopeValue;
    return selected.has(row.id);
  }), [rows, scope, scopeValue, selected]);

  const running = useMemo(() => {
    const groups = new Map<number, OfferRow[]>();
    for (const row of rows) if (row.percent > 0) groups.set(row.percent, [...(groups.get(row.percent) ?? []), row]);
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [rows]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (search && !`${row.name} ${row.sku}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && row.categoryId !== category) return false;
    if (saleState === "on" && row.percent === 0) return false;
    if (saleState === "off" && row.percent > 0) return false;
    return true;
  }), [rows, search, category, saleState]);

  async function send(body: Record<string, unknown>, done: string) {
    setBusy(true); setNote(null);
    try {
      const response = await fetch("/api/admin/offers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update prices.");
      setRows(result.data.rows);
      setNote({ ok: true, text: `${done}${result.data.skipped ? ` (${plural(result.data.skipped, "product")} skipped — the discounted price would be too low.)` : ""}` });
      return true;
    } catch (error) {
      setNote({ ok: false, text: error instanceof Error ? error.message : "Could not update prices." });
      return false;
    } finally { setBusy(false); }
  }

  async function startSale() {
    if (!targets.length || !pctValid) return;
    if (targets.length > 1 && !window.confirm(`Put ${plural(targets.length, "product")} on ${pct}% off? Prices change on the store straight away.`)) return;
    if (await send({ action: "APPLY_PERCENT", productIds: targets.map((row) => row.id), percent: pct }, `Done — ${plural(targets.length, "product")} now ${pct}% off.`)) { setPercent(""); setSelected(new Set()); }
  }
  async function endSale(ids: string[], label: string) {
    if (!window.confirm(`End the sale on ${label}? They go back to their regular price.`)) return;
    await send({ action: "CLEAR", productIds: ids }, `Sale ended on ${label}.`);
  }
  async function setRow(row: OfferRow) {
    const value = Number(rowPercent[row.id]);
    if (!Number.isInteger(value) || value < 1 || value > 90) { setNote({ ok: false, text: "Type a whole number from 1 to 90." }); return; }
    if (await send({ action: "APPLY_PERCENT", productIds: [row.id], percent: value }, `${row.name}: ${value}% off.`)) setRowPercent((current) => ({ ...current, [row.id]: "" }));
  }
  function toggle(id: string) { setScope("pick"); setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  const allShownPicked = filtered.length > 0 && filtered.every((row) => selected.has(row.id));
  function toggleShown() { setScope("pick"); setSelected((current) => { const next = new Set(current); filtered.forEach((row) => (allShownPicked ? next.delete(row.id) : next.add(row.id))); return next; }); }

  const scopeCards: [Scope, string, string][] = [["all", "Everything", plural(rows.length, "product")], ["category", "One category", "e.g. Earphones"], ["brand", "One brand", "e.g. Samsung"], ["condition", "New / refurbished", "by condition"], ["pick", "Pick myself", selected.size ? `${selected.size} picked` : "tick in the list below"]];
  const preview = targets.slice(0, 3);

  return <div className="studio-wrap">
    <section className="studio">
      <div className="studio-head"><div><h2>Start a sale</h2><p>Three quick steps. The new prices show on your store straight away.</p></div>{running.length > 0 && <button type="button" className="danger-ghost" disabled={busy} onClick={() => endSale(rows.filter((row) => row.percent > 0).map((row) => row.id), `all ${plural(rows.filter((row) => row.percent > 0).length, "product")}`)}>End every sale</button>}</div>

      <div className="step"><span className="step-n">1</span><div className="step-body">
        <h3>What is on sale?</h3>
        <div className="scope-cards" role="group" aria-label="What is on sale">{scopeCards.map(([key, title, hint]) => <button type="button" key={key} aria-pressed={scope === key} className={scope === key ? "scope on" : "scope"} onClick={() => { setScope(key); setScopeValue(""); }}><b>{title}</b><small>{hint}</small></button>)}</div>
        {scope === "category" && <select value={scopeValue} onChange={(event) => setScopeValue(event.target.value)} aria-label="Choose a category"><option value="">Choose a category…</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
        {scope === "brand" && <select value={scopeValue} onChange={(event) => setScopeValue(event.target.value)} aria-label="Choose a brand"><option value="">Choose a brand…</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
        {scope === "condition" && <select value={scopeValue} onChange={(event) => setScopeValue(event.target.value)} aria-label="Choose a condition"><option value="">Choose…</option>{conditions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
        {scope === "pick" && <p className="step-hint">Tick the products you want in the list further down this page.</p>}
      </div></div>

      <div className="step"><span className="step-n">2</span><div className="step-body">
        <h3>How much off?</h3>
        <div className="chips">{presets.map((value) => <button type="button" key={value} className={pct === value ? "chip on" : "chip"} onClick={() => setPercent(String(value))}>{value}%</button>)}<label className="chip-custom"><input type="number" min={1} max={90} inputMode="numeric" placeholder="Other" value={percent} onChange={(event) => setPercent(event.target.value)} aria-label="Custom percent off" /><span>% off</span></label></div>
      </div></div>

      <div className="step"><span className="step-n">3</span><div className="step-body">
        <h3>Check and start</h3>
        {targets.length && pctValid ? <>
          <p className="summary"><b>{plural(targets.length, "product")}</b> will be <b>{pct}% off</b>.</p>
          <ul className="preview">{preview.map((row) => { const next = salePriceFor(row.original, pct); return <li key={row.id}><span>{row.name}</span><span><del>{inr(row.original)}</del> → <b>{next === null ? "skipped" : inr(next)}</b></span></li>; })}{targets.length > preview.length && <li className="more">…and {targets.length - preview.length} more</li>}</ul>
        </> : <p className="step-hint">{!targets.length ? "Choose what is on sale in step 1." : "Choose a discount in step 2."}</p>}
        <button type="button" className="primary-button start-sale" disabled={busy || !targets.length || !pctValid} onClick={startSale}>{busy ? "Saving…" : "Start sale"}</button>
      </div></div>
      {note && <p className={note.ok ? "studio-note ok" : "studio-note bad"} role="status">{note.text}</p>}
    </section>

    <section className="running">
      <h2>Running now</h2>
      {running.length ? <ul>{running.map(([value, group]) => <li key={value}><span className="pct-badge">{value}% off</span><div><b>{plural(group.length, "product")}</b><small>{group.slice(0, 3).map((row) => row.name).join(", ")}{group.length > 3 ? ` +${group.length - 3} more` : ""}</small></div><button type="button" disabled={busy} onClick={() => endSale(group.map((row) => row.id), `${plural(group.length, "product")} (${value}% off)`)}>End sale</button></li>)}</ul> : <p className="step-hint">No sales are running. Products show their regular price.</p>}
    </section>

    <section className="finetune">
      <h2>All products <small>fine-tune one at a time</small></h2>
      <div className="offer-filters simple">
        <input type="search" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search products" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select value={saleState} onChange={(event) => setSaleState(event.target.value)} aria-label="Sale status"><option value="">All</option><option value="on">On sale</option><option value="off">Not on sale</option></select>
      </div>
      <div className="offer-table-wrap">
        <table className="offer-table">
          <thead><tr><th><input type="checkbox" checked={allShownPicked} onChange={toggleShown} aria-label="Pick all shown" /></th><th>Product</th><th>Regular</th><th>Now</th><th>Discount</th><th>Change</th></tr></thead>
          <tbody>{filtered.map((row) => {
            const preview = scope === "pick" && selected.has(row.id) && pctValid ? salePriceFor(row.original, pct) : null;
            return <tr key={row.id} className={selected.has(row.id) ? "picked" : ""}>
              <td><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} aria-label={`Pick ${row.name}`} /></td>
              <td><div className="offer-product">{row.image ? <img src={row.image} alt="" /> : <span />}<div><b>{row.name}</b><small>{row.category} · {row.brand}{row.status !== "ACTIVE" ? ` · ${row.status.toLowerCase()}` : ""}</small></div></div></td>
              <td>{row.percent > 0 ? <del>{inr(row.original)}</del> : inr(row.original)}</td>
              <td><b>{inr(row.price)}</b>{preview !== null && <span className="offer-preview">→ {inr(preview)}</span>}</td>
              <td>{row.percent > 0 ? <span className="pct-badge">{row.percent}% off</span> : <span className="muted">—</span>}</td>
              <td><div className="offer-row-set"><input type="number" min={1} max={90} inputMode="numeric" placeholder="%" value={rowPercent[row.id] ?? ""} onChange={(event) => setRowPercent((current) => ({ ...current, [row.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") void setRow(row); }} aria-label={`Percent off ${row.name}`} /><button type="button" disabled={busy} onClick={() => setRow(row)}>Set</button>{row.percent > 0 && <button type="button" className="ghost" disabled={busy} onClick={() => send({ action: "CLEAR", productIds: [row.id] }, `Sale ended on ${row.name}.`)}>End</button>}</div></td>
            </tr>;
          })}</tbody>
        </table>
        {!filtered.length && <p className="offer-empty">No products match.</p>}
      </div>
    </section>
  </div>;
}
