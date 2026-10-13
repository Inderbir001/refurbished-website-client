"use client";
import { useEffect, useRef, useState } from "react";

type Suggestion = { placeId: string; main: string; secondary: string };
export type PickedAddress = { line1: string; line2: string; city: string; state: string; pincode: string };

// Sets uncontrolled form inputs by name and lets React-controlled listeners (onChange) hear about it.
export function fillAddress(form: HTMLFormElement | null, address: PickedAddress) {
  if (!form) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  for (const [name, value] of Object.entries(address)) {
    const input = form.elements.namedItem(name);
    if (input instanceof HTMLInputElement && (value || name !== "line2")) { setter?.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); }
  }
}

// "Search your address" box: suggestions as you type, then city / state / pincode are filled in. Hides itself when the
// store has no Google Places key configured, so the plain form keeps working either way.
export function AddressSearch({ onPick }: { onPick: (address: PickedAddress) => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [active, setActive] = useState(-1);
  const session = useRef("");
  const request = useRef(0);
  const chosen = useRef(""); // the text we put in the box after a pick, so it does not trigger a new search
  useEffect(() => { session.current = crypto.randomUUID(); }, []);
  useEffect(() => {
    if (query.trim().length < 3 || query === chosen.current) { setItems([]); return; }
    const id = ++request.current;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/places/autocomplete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: query.trim(), sessionToken: session.current }) });
        const result = await response.json();
        if (id !== request.current) return;
        if (!response.ok) { setItems([]); return; }
        if (result.data?.enabled === false) { setEnabled(false); return; }
        setItems(result.data?.suggestions ?? []); setOpen(true); setActive(-1);
      } catch { if (id === request.current) setItems([]); }
    }, 260);
    return () => clearTimeout(timer);
  }, [query]);
  if (!enabled) return null;

  async function choose(item: Suggestion) {
    setBusy(true); setNote(""); setOpen(false);
    try {
      const response = await fetch("/api/places/details", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ placeId: item.placeId, sessionToken: session.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load that address.");
      onPick(result.data.address as PickedAddress);
      chosen.current = `${item.main}${item.secondary ? `, ${item.secondary}` : ""}`;
      setQuery(chosen.current); setItems([]);
      setNote("Address filled in. Add your flat / house number and check the details.");
      session.current = crypto.randomUUID(); // one billing session per completed search
    } catch (error) { setNote(error instanceof Error ? error.message : "Could not load that address."); }
    setBusy(false);
  }

  return <div className="address-search wide-field">
    <label>Search your address
      <input type="search" autoComplete="off" value={query} placeholder="Start typing your area, street or landmark" role="combobox" aria-expanded={open && items.length > 0} aria-autocomplete="list"
        onChange={(event) => { setQuery(event.target.value); setNote(""); }}
        onFocus={() => items.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, items.length - 1)); }
          else if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
          else if (event.key === "Enter" && open && active >= 0) { event.preventDefault(); void choose(items[active]); }
          else if (event.key === "Escape") setOpen(false);
        }} />
    </label>
    {open && items.length > 0 && <ul className="address-suggestions" role="listbox">{items.map((item, index) => <li key={item.placeId} role="option" aria-selected={index === active} className={index === active ? "on" : ""} onMouseDown={(event) => { event.preventDefault(); void choose(item); }}><b>{item.main}</b><span>{item.secondary}</span></li>)}</ul>}
    {busy ? <small>Filling in your address…</small> : note ? <small>{note}</small> : <small>Or fill in the fields below by hand.</small>}
  </div>;
}
