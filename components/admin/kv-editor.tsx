"use client";

export type Pair = { k: string; v: string };
export const toPairs = (value: Record<string, string> | null | undefined): Pair[] => Object.entries(value ?? {}).map(([k, v]) => ({ k, v: String(v) }));
export const fromPairs = (pairs: Pair[]): Record<string, string> => Object.fromEntries(pairs.map((pair) => [pair.k.trim(), pair.v.trim()] as const).filter(([k, v]) => k && v));

// "Name → value" rows, for things like specifications (Display: 6.1 inch). Replaces typing raw JSON.
export function KvEditor({ pairs, onChange, keyPlaceholder, valuePlaceholder, addLabel }: { pairs: Pair[]; onChange: (pairs: Pair[]) => void; keyPlaceholder: string; valuePlaceholder: string; addLabel: string }) {
  const set = (index: number, patch: Partial<Pair>) => onChange(pairs.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)));
  return <div className="adm-kv">
    {pairs.map((pair, index) => <div className="adm-kv-row" key={index}>
      <input value={pair.k} onChange={(event) => set(index, { k: event.target.value })} placeholder={keyPlaceholder} aria-label={keyPlaceholder} />
      <input value={pair.v} onChange={(event) => set(index, { v: event.target.value })} placeholder={valuePlaceholder} aria-label={valuePlaceholder} />
      <button type="button" className="adm-link danger" onClick={() => onChange(pairs.filter((_, i) => i !== index))}>Remove</button>
    </div>)}
    <div><button type="button" className="adm-btn small ghost" onClick={() => onChange([...pairs, { k: "", v: "" }])}>+ {addLabel}</button></div>
  </div>;
}
