// Product descriptions arrive in many shapes (pasted from marketplaces, typed by hand, imported from a CSV):
// "•" bullets, "Label: value" lines, blank-line separated paragraphs, one giant paragraph, or labels glued together
// with no line break at all. This turns any of them into a few tidy blocks that the product page can lay out.

export type DescItem = { label?: string; text: string };
export type DescBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: DescItem[] };

const BULLET = /^\s*(?:[•▪●◦·✓✔►▶➤*]|[-–—](?=\s))\s*/;
const LABELLED = /^([A-Z0-9][^:\n]{1,48}?):\s+(\S[\s\S]*)$/;
// Never split inside a number with a unit ("5000mAh", "90Hz"): the break is only allowed after a letter/bracket that is not part of such a figure.
const DASHED = /^([A-Z0-9][^—–:\n]{1,48}?)\s+[—–]\s+(\S[\s\S]*)$/; // "Stunning Shots — The 50MP camera…"
const GLUED_LABEL =/((?<![A-Z])[a-z]|[)\]"”'’%.])(?<!\d[a-z]{0,3})(?=[A-Z][A-Za-z0-9&/+-]*(?: (?:[A-Z0-9][A-Za-z0-9&/+-]*|&|and|of|for|with|in|to)){0,3}:\s)/g;

function sentences(text: string) {
  // A very long paragraph is split into readable chunks of two or three sentences.
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
  const chunks: string[] = []; let current = "";
  for (const part of parts) {
    current = current ? `${current} ${part}` : part;
    if (current.length >= 220) { chunks.push(current); current = ""; }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function parseDescription(raw: string | null | undefined): DescBlock[] {
  let text = (raw ?? "").replace(/\r\n?/g, "\n").replace(/ /g, " ").trim();
  if (!text) return [];
  text = text.replace(/([^\n])[ \t]*[•▪●][ \t]*/g, "$1\n• "); // bullets in the middle of a line start a new line
  text = text.replace(GLUED_LABEL, "$1\n"); // "…refresh rateProcessor: …" -> two lines

  const blocks: DescBlock[] = [];
  let list: DescItem[] | null = null;
  const flush = () => { if (list?.length) blocks.push({ kind: "list", items: list }); list = null; };

  const lines = text.split("\n").map((entry) => entry.trim());
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line) continue;
    const bullet = BULLET.test(line);
    const body = line.replace(BULLET, "").trim();
    if (!body) continue;
    const labelled = body.match(LABELLED) ?? body.match(DASHED);
    const label = labelled && labelled[1].split(/\s+/).length <= 7 && !/[.!?]|https?:/i.test(labelled[1]) ? labelled : null;

    if (!bullet && /:$/.test(body) && body.length <= 60) { flush(); blocks.push({ kind: "heading", text: body.replace(/:$/, "") }); continue; }
    if (!bullet && body.length <= 50 && /^[^a-z]*[A-Z][^a-z]*$/.test(body) && /[A-Z]{3}/.test(body)) { flush(); blocks.push({ kind: "heading", text: body }); continue; }
    if (bullet || label) {
      list = list ?? [];
      list.push(label ? { label: label[1].trim(), text: label[2].trim() } : { text: body });
      continue;
    }
    // A short plain line right above a list is a sub-heading ("General", "iPad Models").
    const next = lines.slice(index + 1).find(Boolean);
    if (!bullet && body.length <= 32 && !/[.!?,;]$/.test(body) && next && (BULLET.test(next) || LABELLED.test(next))) { flush(); blocks.push({ kind: "heading", text: body }); continue; }
    flush();
    for (const chunk of body.length > 420 ? sentences(body) : [body]) blocks.push({ kind: "paragraph", text: chunk });
  }
  flush();
  return blocks;
}

// One clean line of text for search engines and link previews.
export function plainDescription(raw: string | null | undefined, max = 155) {
  const text = parseDescription(raw).flatMap((block) => block.kind === "list" ? block.items.map((item) => (item.label ? `${item.label}: ${item.text}` : item.text)) : [block.text]).join(". ").replace(/\.\s*\./g, ".").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// A few short headline points for the top of the page. Benefit-style labels ("High-Speed Charging") stand on their own;
// spec-style ones ("Display", "Battery") are shown with their value so they say something.
export function highlights(blocks: DescBlock[], count = 4): string[] {
  const items = blocks.flatMap((block) => (block.kind === "list" ? block.items : []));
  const labelled = items.filter((item) => item.label);
  const source = labelled.length >= 2 ? labelled : items;
  return source.slice(0, count).map((item) => {
    const spec = item.label && item.label.split(/\s+/).length <= 2 && /\d/.test(item.text);
    const text = item.label ? (spec ? `${item.label}: ${item.text}` : item.label) : item.text;
    const clean = text.replace(/[.;,]+$/, "");
    return clean.length > 64 ? `${clean.slice(0, 61).trimEnd()}…` : clean;
  });
}
