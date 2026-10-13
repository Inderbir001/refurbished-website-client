// Short facts shown on a product card (RAM, storage, colour). Only what the product's own data or name actually states.
type Source = { name: string; specifications?: unknown; variants?: { attributes?: unknown }[] };

const storage = (value: string) => value.replace(/\s+/g, "").replace(/(\d+)(GB|TB)/i, (_, n, unit) => `${n} ${unit.toUpperCase()}`);

export function cardSpecs(product: Source): string[] {
  const specs = (product.specifications ?? {}) as Record<string, unknown>;
  const attrs = (product.variants?.[0]?.attributes ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  let ram = text(attrs.RAM) || text(specs.RAM);
  let rom = text(attrs.Storage) || text(specs.Storage);
  const name = product.name;
  if (!ram || !rom) {
    // "6GB RAM, 128GB Storage" | "4GB/128GB" | "8/128GB" | "4+64GB" | "(4GB, 64GB)" | "128 GB" with "(8 GB RAM)"
    const ramExplicit = name.match(/(\d{1,2})\s*GB\s*RAM/i);
    const romExplicit = name.match(/(\d{2,4}\s*(?:GB|TB))\s*(?:Storage|ROM|Internal)/i);
    const pair = name.match(/\b(\d{1,2})\s*(?:GB)?\s*[\/+]\s*(\d{2,4})\s*(GB|TB)\b/i) ?? name.match(/\((\d{1,2})\s*GB\s*,\s*(\d{2,4})\s*GB\)/i);
    if (!ram) ram = ramExplicit ? `${ramExplicit[1]} GB` : pair ? `${pair[1]} GB` : "";
    if (!rom) {
      if (romExplicit) rom = storage(romExplicit[1]);
      else if (pair) rom = storage(`${pair[2]}${pair[3] ?? "GB"}`);
      else { const lone = name.match(/\b(\d{2,4})\s*(GB|TB)\b(?!\s*RAM)/i); if (lone) rom = storage(lone[0]); }
    }
  }
  const colour = text(attrs.Color) || text(attrs.Colour) || text(specs.Colour) || text(specs.Color);
  return [ram && `${ram} RAM`, rom, colour].filter((value): value is string => Boolean(value)).slice(0, 3);
}
