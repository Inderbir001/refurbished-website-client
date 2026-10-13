"use client";
import { useState } from "react";

type Photo = { id: string; url: string; alt: string | null };

// The big photo plus a row of small ones. Clicking a small photo (or the arrows) shows it in the big frame.
export function ProductGallery({ images, name }: { images: Photo[]; name: string }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return <div className="gallery"><div className="main-image">Product photo coming soon</div></div>;
  const current = images[Math.min(index, images.length - 1)];
  const go = (step: number) => setIndex((value) => (value + step + images.length) % images.length);
  return <div className="gallery" onKeyDown={(event) => { if (event.key === "ArrowLeft") go(-1); if (event.key === "ArrowRight") go(1); }}>
    <div className="main-image">
      <img src={current.url} alt={current.alt ?? name} />
      {images.length > 1 && <>
        <button type="button" className="gallery-nav prev" aria-label="Previous photo" onClick={() => go(-1)}>‹</button>
        <button type="button" className="gallery-nav next" aria-label="Next photo" onClick={() => go(1)}>›</button>
        <span className="gallery-count">{index + 1} / {images.length}</span>
      </>}
    </div>
    {images.length > 1 && <div className="thumbs">
      {images.map((image, position) => <button key={image.id} type="button" className={position === index ? "on" : ""} aria-label={`Show photo ${position + 1} of ${images.length}`} aria-current={position === index} onClick={() => setIndex(position)}><img src={image.url} alt="" loading="lazy" /></button>)}
    </div>}
  </div>;
}
