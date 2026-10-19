"use client";
import { useState } from "react";
import { parseVideo } from "@/lib/video";
import { Pic } from "@/components/store/pic";

type Photo = { id: string; url: string; alt: string | null };
type Item = { key: string; kind: "photo"; url: string; alt: string | null } | { key: string; kind: "video"; url: string };

// The big picture plus a row of small ones. Photos first, then videos (marked with a play button).
// Clicking a small one (or the arrows / arrow keys) shows it in the big frame. Hovering a photo magnifies it (mouse devices only).
function track(event: React.MouseEvent<HTMLDivElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--zx", `${((event.clientX - box.left) / box.width) * 100}%`);
  event.currentTarget.style.setProperty("--zy", `${((event.clientY - box.top) / box.height) * 100}%`);
}

export function ProductGallery({ images, videos = [], name }: { images: Photo[]; videos?: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const items: Item[] = [...images.map((image): Item => ({ key: image.id, kind: "photo", url: image.url, alt: image.alt })), ...videos.filter((url) => parseVideo(url)).map((url): Item => ({ key: url, kind: "video", url }))];
  if (!items.length) return <div className="gallery"><div className="main-image">Product photo coming soon</div></div>;
  const current = items[Math.min(index, items.length - 1)];
  const go = (step: number) => setIndex((value) => (value + step + items.length) % items.length);
  const info = current.kind === "video" ? parseVideo(current.url) : null;

  return <div className="gallery" onKeyDown={(event) => { if (event.key === "ArrowLeft") go(-1); if (event.key === "ArrowRight") go(1); }}>
    <div className={current.kind === "video" ? "main-image is-video" : "main-image"} onMouseMove={current.kind === "photo" ? track : undefined}>
      {current.kind === "photo" && <Pic key={current.key} src={current.url} size={900} alt={current.alt ?? name} priority={index === 0} loading="eager" />}
      {info?.kind === "file" && <video key={current.key} src={info.url} controls playsInline preload="metadata" aria-label={`Video of ${name}`} />}
      {(info?.kind === "youtube" || info?.kind === "vimeo") && <iframe key={current.key} src={info.embed} title={`Video of ${name}`} allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />}
      {items.length > 1 && <>
        <button type="button" className="gallery-nav prev" aria-label="Previous" onClick={() => go(-1)}>‹</button>
        <button type="button" className="gallery-nav next" aria-label="Next" onClick={() => go(1)}>›</button>
        <span className="gallery-count">{index + 1} / {items.length}</span>
      </>}
    </div>
    {items.length > 1 && <div className="thumbs">
      {items.map((item, position) => {
        const video = item.kind === "video" ? parseVideo(item.url) : null;
        return <button key={item.key} type="button" className={`${position === index ? "on" : ""}${item.kind === "video" ? " vid" : ""}`.trim()} aria-label={item.kind === "video" ? `Play video ${position + 1 - images.length}` : `Show photo ${position + 1} of ${images.length}`} aria-current={position === index} onClick={() => setIndex(position)}>
          {item.kind === "photo" ? <Pic src={item.url} size={480} alt="" /> : video?.kind === "youtube" ? <img src={video.thumb} alt="" loading="lazy" /> : video?.kind === "file" ? <video src={`${video.url}#t=0.5`} preload="metadata" muted playsInline /> : <span className="vid-blank" />}
          {item.kind === "video" && <i aria-hidden>▶</i>}
        </button>;
      })}
    </div>}
  </div>;
}
