import { parseDescription, type DescBlock } from "@/lib/description";

function Block({ block }: { block: DescBlock }) {
  if (block.kind === "heading") return <h3 className="desc-h">{block.text}</h3>;
  if (block.kind === "paragraph") return <p className="desc-p">{block.text}</p>;
  return <ul className="desc-list">{block.items.map((item, index) => <li key={index}>{item.label ? <><b>{item.label}</b><span>{item.text}</span></> : <span>{item.text}</span>}</li>)}</ul>;
}

// The product's description, laid out as headings, short paragraphs and tidy feature rows.
// A long one shows the first part and keeps the rest one tap away, so the page stays easy to scan.
export function ProductDescription({ text }: { text: string }) {
  const blocks = parseDescription(text);
  if (!blocks.length) return null;
  const size = (block: DescBlock) => (block.kind === "list" ? block.items.length : 1);
  let shown = 0; let cut = blocks.length;
  for (let i = 0; i < blocks.length; i++) { shown += size(blocks[i]); if (shown >= 8 && i < blocks.length - 1) { cut = i + 1; break; } }
  const head = blocks.slice(0, cut); const rest = blocks.slice(cut);
  return <div className="desc">
    {head.map((block, index) => <Block key={index} block={block} />)}
    {rest.length > 0 && <details className="desc-more"><summary><span className="more">Show full description</span><span className="less">Show less</span></summary>{rest.map((block, index) => <Block key={index} block={block} />)}</details>}
  </div>;
}
