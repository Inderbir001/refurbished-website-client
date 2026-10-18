"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { uploadImage } from "@/lib/image-upload";

export type StudioProduct = { name: string; slug: string; image: string };
export type StudioCategory = { name: string; slug: string };
export type NewSlide = { title: string; imageUrl: string; mobileImageUrl: string; linkUrl?: string };

type Theme = { id: string; name: string; bg: [string, string]; text: string; sub: string; accent: string; accentText: string; light: boolean };
const THEMES: Theme[] = [
  { id: "forest", name: "Forest", bg: ["#14211f", "#2a5546"], text: "#ffffff", sub: "#cfe0d8", accent: "#d7f371", accentText: "#14211f", light: false },
  { id: "sunset", name: "Sunset", bg: ["#ff7a4d", "#ff3d6e"], text: "#ffffff", sub: "#ffe9e2", accent: "#ffffff", accentText: "#c2321a", light: false },
  { id: "midnight", name: "Midnight", bg: ["#0f172a", "#43338f"], text: "#ffffff", sub: "#d3d8ee", accent: "#fbbf24", accentText: "#1c1503", light: false },
  { id: "ocean", name: "Ocean", bg: ["#0a4a85", "#22a6dc"], text: "#ffffff", sub: "#dff2fb", accent: "#ffe066", accentText: "#14211f", light: false },
  { id: "berry", name: "Berry", bg: ["#5f1450", "#e0386f"], text: "#ffffff", sub: "#ffdcec", accent: "#ffe3ef", accentText: "#7a1239", light: false },
  { id: "gold", name: "Gold", bg: ["#241b12", "#6e5020"], text: "#fff6e0", sub: "#e6d6b0", accent: "#ffd36b", accentText: "#2b1f08", light: false },
  { id: "cream", name: "Cream", bg: ["#fff5ea", "#ffd8bd"], text: "#14211f", sub: "#52615c", accent: "#fb6b48", accentText: "#ffffff", light: true },
  { id: "mint", name: "Mint", bg: ["#e2f7ec", "#a9e5cd"], text: "#0e3a2b", sub: "#3f6a5a", accent: "#0f7a4d", accentText: "#ffffff", light: true },
];

type Opts = { theme: Theme; badge: string; headline: string; sub: string; price: string; button: string; side: "right" | "left" };

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []; let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); }

// Draws one banner. `mobile` stacks the text above the photo; desktop puts them side by side.
function draw(canvas: HTMLCanvasElement, family: string, opts: Opts, photo: HTMLImageElement | null, mobile: boolean) {
  const w = mobile ? 900 : 1600; const h = mobile ? 750 : 640;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!; const t = opts.theme;
  const grad = ctx.createLinearGradient(0, 0, w, h); grad.addColorStop(0, t.bg[0]); grad.addColorStop(1, t.bg[1]);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  // soft shapes for depth
  ctx.fillStyle = t.light ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.07)";
  ctx.beginPath(); ctx.arc(mobile ? w * 0.8 : opts.side === "right" ? w * 0.76 : w * 0.24, mobile ? h * 0.74 : h * 0.52, mobile ? 300 : 360, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = t.light ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.05)";
  ctx.beginPath(); ctx.arc(mobile ? -40 : opts.side === "right" ? -60 : w + 60, mobile ? 40 : h * 0.1, mobile ? 190 : 230, 0, Math.PI * 2); ctx.fill();

  // photo in a white circle
  const radius = mobile ? 185 : 262;
  const cx = mobile ? w * 0.74 : opts.side === "right" ? w * 0.755 : w * 0.245;
  const cy = mobile ? h - radius - 36 : h / 2;
  if (photo) {
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
    const box = radius * 1.62; const scale = Math.min(box / photo.width, box / photo.height);
    ctx.drawImage(photo, cx - (photo.width * scale) / 2, cy - (photo.height * scale) / 2, photo.width * scale, photo.height * scale); ctx.restore();
  }

  // text block
  const x0 = mobile ? 56 : opts.side === "right" ? 96 : w * 0.47;
  const maxW = mobile ? w - 112 : w * 0.43;
  const blocks: { h: number; paint: (y: number) => void }[] = [];
  if (opts.badge.trim()) {
    const size = mobile ? 24 : 26; ctx.font = `700 ${size}px ${family}`;
    const label = opts.badge.trim().toUpperCase(); ctx.letterSpacing = "1.5px"; const bw = ctx.measureText(label).width + 48; ctx.letterSpacing = "0px";
    blocks.push({ h: size + 26, paint: (y) => { ctx.fillStyle = t.accent; pill(ctx, x0, y, bw, size + 24); ctx.fill(); ctx.fillStyle = t.accentText; ctx.textBaseline = "middle"; ctx.letterSpacing = "1.5px"; ctx.fillText(label, x0 + 22, y + (size + 24) / 2 + 1); ctx.letterSpacing = "0px"; } });
  }
  let hs = mobile ? 76 : 96; let lines: string[] = [];
  for (; hs >= 40; hs -= 4) { ctx.font = `800 ${hs}px ${family}`; lines = wrap(ctx, opts.headline.trim() || "Your headline", maxW); if (lines.length <= (mobile ? 2 : 3)) break; }
  blocks.push({ h: lines.length * hs * 1.06, paint: (y) => { ctx.font = `800 ${hs}px ${family}`; ctx.fillStyle = t.text; ctx.textBaseline = "alphabetic"; lines.forEach((line, i) => ctx.fillText(line, x0, y + hs * 0.86 + i * hs * 1.06)); } });
  if (opts.sub.trim()) {
    const size = mobile ? 30 : 36; ctx.font = `500 ${size}px ${family}`; const sl = wrap(ctx, opts.sub.trim(), maxW).slice(0, 2);
    blocks.push({ h: sl.length * size * 1.4, paint: (y) => { ctx.font = `500 ${size}px ${family}`; ctx.fillStyle = t.sub; ctx.textBaseline = "alphabetic"; sl.forEach((line, i) => ctx.fillText(line, x0, y + size * 1.05 + i * size * 1.4)); } });
  }
  if (opts.price.trim()) {
    const size = mobile ? 38 : 46; ctx.font = `800 ${size}px ${family}`; const label = opts.price.trim();
    blocks.push({ h: size + 6, paint: (y) => { ctx.font = `800 ${size}px ${family}`; ctx.fillStyle = t.accent; ctx.textBaseline = "alphabetic"; ctx.fillText(label, x0, y + size * 0.95); } });
  }
  if (opts.button.trim()) {
    const size = mobile ? 28 : 30; ctx.font = `700 ${size}px ${family}`; const label = `${opts.button.trim()}  →`; const bw = ctx.measureText(label).width + 72; const bh = size + 40;
    blocks.push({ h: bh, paint: (y) => { ctx.fillStyle = t.light ? t.accent : t.accent; pill(ctx, x0, y, bw, bh); ctx.fill(); ctx.font = `700 ${size}px ${family}`; ctx.fillStyle = t.accentText; ctx.textBaseline = "middle"; ctx.fillText(label, x0 + 36, y + bh / 2 + 1); } });
  }
  const gap = mobile ? 22 : 28;
  const total = blocks.reduce((sum, block) => sum + block.h, 0) + gap * (blocks.length - 1);
  let y = mobile ? 56 : Math.max(48, (h - total) / 2);
  for (const block of blocks) { block.paint(y); y += block.h + gap; }
}

async function loadPhoto(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => resolve(img); img.onerror = () => reject(new Error("That photo could not be loaded.")); img.src = src; });
}
const toBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The banner could not be created."))), "image/png"));

// Admin → Homepage → "Create a banner": pick a colour, type the offer, choose a product photo. The picture is drawn here in the browser.
export function BannerStudio({ products, categories, onCreate, busy }: { products: StudioProduct[]; categories: StudioCategory[]; onCreate: (slide: NewSlide) => Promise<boolean>; busy: boolean }) {
  const [themeId, setThemeId] = useState("forest");
  const [badge, setBadge] = useState("Limited offer");
  const [headline, setHeadline] = useState("Up to 60% off on phones");
  const [sub, setSub] = useState("Certified refurbished and new, with warranty.");
  const [price, setPrice] = useState("");
  const [button, setButton] = useState("Shop now");
  const [side, setSide] = useState<"right" | "left">("right");
  const [photoUrl, setPhotoUrl] = useState(products[0]?.image ?? "");
  const [search, setSearch] = useState("");
  const [link, setLink] = useState("/products");
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const desktop = useRef<HTMLCanvasElement>(null);
  const phone = useRef<HTMLCanvasElement>(null);
  const [family, setFamily] = useState("sans-serif");
  const theme = THEMES.find((item) => item.id === themeId) ?? THEMES[0];

  useEffect(() => {
    const head = getComputedStyle(document.documentElement).getPropertyValue("--font-head").trim() || "sans-serif";
    setFamily(head);
    Promise.all([document.fonts.load(`800 40px ${head}`), document.fonts.load(`500 30px ${head}`), document.fonts.load(`700 30px ${head}`)]).catch(() => undefined);
  }, []);
  useEffect(() => {
    let live = true; setError("");
    if (!photoUrl) { setPhoto(null); return; }
    loadPhoto(photoUrl).then((img) => { if (live) setPhoto(img); }).catch(() => { if (live) { setPhoto(null); setError("That photo could not be loaded, so the banner shows without it. Try another product, or upload your own picture."); } });
    return () => { live = false; };
  }, [photoUrl]);
  const opts: Opts = { theme, badge, headline, sub, price, button, side };
  useEffect(() => {
    const render = () => { if (desktop.current) draw(desktop.current, family, opts, photo, false); if (phone.current) draw(phone.current, family, opts, photo, true); };
    render(); document.fonts.ready.then(render);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = useMemo(() => { const text = search.trim().toLowerCase(); return products.filter((item) => !text || item.name.toLowerCase().includes(text)).slice(0, 24); }, [products, search]);
  const links: [string, string][] = [["/products", "All products"], ["/products?condition=REFURBISHED", "Refurbished phones"], ...categories.map((category): [string, string] => [`/category/${category.slug}`, `Category: ${category.name}`]), ...products.slice(0, 40).map((product): [string, string] => [`/products/${product.slug}`, `Product: ${product.name}`])];

  async function create() {
    if (!headline.trim()) return setError("Type a headline first.");
    setWorking(true); setError("");
    try {
      if (desktop.current) draw(desktop.current, family, opts, photo, false); if (phone.current) draw(phone.current, family, opts, photo, true);
      const title = headline.trim().slice(0, 80);
      const [big, small] = await Promise.all([toBlob(desktop.current!), toBlob(phone.current!)]);
      const [imageUrl, mobileImageUrl] = await Promise.all([uploadImage(new File([big], "banner-desktop.png", { type: "image/png" }), title), uploadImage(new File([small], "banner-phone.png", { type: "image/png" }), title)]);
      await onCreate({ title, imageUrl, mobileImageUrl, linkUrl: link || undefined });
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "The banner could not be created.";
      setError(/tainted|insecure|security/i.test(text) ? "This product photo cannot be used in a banner. Pick another product." : text);
    }
    setWorking(false);
  }

  return <div className="bs">
    <div className="bs-preview">
      <canvas ref={desktop} aria-label="Banner preview for computers" />
      <div className="bs-phone"><small>On phones</small><canvas ref={phone} aria-label="Banner preview for phones" /></div>
    </div>
    <div className="bs-controls">
      <div className="bs-field"><span>Colours</span><div className="bs-themes">{THEMES.map((item) => <button key={item.id} type="button" title={item.name} aria-label={item.name} aria-pressed={item.id === themeId} className={item.id === themeId ? "on" : ""} style={{ background: `linear-gradient(135deg, ${item.bg[0]}, ${item.bg[1]})` }} onClick={() => setThemeId(item.id)} />)}</div></div>
      <div className="bs-row">
        <label className="bs-field"><span>Small label (optional)</span><input value={badge} maxLength={24} onChange={(event) => setBadge(event.target.value)} placeholder="Festive sale" /></label>
        <label className="bs-field"><span>Headline</span><input value={headline} maxLength={48} onChange={(event) => setHeadline(event.target.value)} placeholder="Up to 60% off on phones" /></label>
      </div>
      <label className="bs-field"><span>Line under it (optional)</span><input value={sub} maxLength={90} onChange={(event) => setSub(event.target.value)} /></label>
      <div className="bs-row">
        <label className="bs-field"><span>Price or offer (optional)</span><input value={price} maxLength={22} onChange={(event) => setPrice(event.target.value)} placeholder="From ₹599" /></label>
        <label className="bs-field"><span>Button text (empty for none)</span><input value={button} maxLength={18} onChange={(event) => setButton(event.target.value)} /></label>
      </div>
      <div className="bs-row">
        <label className="bs-field"><span>Where it opens</span><select value={link} onChange={(event) => setLink(event.target.value)}>{links.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="bs-field"><span>Photo position</span><div className="bs-seg"><button type="button" className={side === "right" ? "on" : ""} onClick={() => setSide("right")}>On the right</button><button type="button" className={side === "left" ? "on" : ""} onClick={() => setSide("left")}>On the left</button></div></div>
      </div>
      <div className="bs-field"><span>Product photo</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your products…" aria-label="Search products for the photo" />
        <div className="bs-photos">
          <button type="button" className={!photoUrl ? "on none" : "none"} onClick={() => setPhotoUrl("")}>No photo</button>
          {matches.map((item) => <button key={item.slug} type="button" title={item.name} className={photoUrl === item.image ? "on" : ""} onClick={() => setPhotoUrl(item.image)}><img src={item.image} alt={item.name} loading="lazy" /></button>)}
        </div>
      </div>
      {error && <p className="bs-error" role="alert">{error}</p>}
      <div><button type="button" className="primary-button" disabled={busy || working} onClick={create}>{working ? "Creating…" : "Add this banner to the slideshow"}</button></div>
    </div>
  </div>;
}
