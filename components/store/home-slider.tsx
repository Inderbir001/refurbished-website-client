"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { thumbUrl } from "@/lib/image-url";

export type Slide = { id: string; title: string; href: string | null; image: string; mobile: string | null };

// The offers slideshow at the top of the homepage. Pictures come from Admin → Homepage.
// Auto-plays on its own (it only holds still while a finger is on it, or after the visitor presses the pause button), with arrows, dots, swipe and arrow keys.
export function HomeSlider({ slides, interval = 5500 }: { slides: Slide[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // a finger is on the slide
  const [stopped, setStopped] = useState(false); // the visitor pressed pause
  const touch = useRef<number | null>(null);
  const count = slides.length;
  // Only the slide on screen (and the one after it) is downloaded; the others wait until they are about to be shown.
  const [seen, setSeen] = useState<number[]>([0, 1]);
  useEffect(() => { setSeen((list) => { const next = [index, (index + 1) % Math.max(count, 1)]; return next.every((n) => list.includes(n)) ? list : [...new Set([...list, ...next])]; }); }, [index, count]);
  const go = useCallback((next: number) => setIndex((next + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || stopped) return;
    const timer = setTimeout(() => setIndex((current) => (current + 1) % count), interval);
    return () => clearTimeout(timer);
  }, [index, paused, stopped, count, interval]);

  if (!count) return null;
  return <section className={paused || stopped ? "slider is-stopped" : "slider"} style={{ "--iv": `${interval}ms` } as React.CSSProperties} aria-roledescription="carousel" aria-label="Current offers"
    onKeyDown={(event) => { if (event.key === "ArrowLeft") go(index - 1); if (event.key === "ArrowRight") go(index + 1); }}
    onTouchStart={(event) => { touch.current = event.touches[0].clientX; setPaused(true); }}
    onTouchEnd={(event) => { const start = touch.current; touch.current = null; setPaused(false); if (start == null) return; const delta = event.changedTouches[0].clientX - start; if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1)); }}>
    <div className="slider-track">
      {slides.map((slide, position) => {
        const picture = seen.includes(position) ? <picture>{slide.mobile && <source media="(max-width: 700px)" srcSet={thumbUrl(slide.mobile, 900)} />}<img src={thumbUrl(slide.image, 1600)} alt={slide.title} loading={position === 0 ? "eager" : "lazy"} fetchPriority={position === 0 ? "high" : undefined} decoding="async" draggable={false} onError={(event) => { const el = event.currentTarget; if (el.dataset.fb) return; el.dataset.fb = "1"; el.parentElement?.querySelectorAll("source").forEach((source) => source.remove()); el.src = window.matchMedia("(max-width: 700px)").matches && slide.mobile ? slide.mobile : slide.image; }} /></picture> : <span className="slide-empty" aria-hidden="true" />;
        return <div key={slide.id} className={position === index ? "slide on" : "slide"} role="group" aria-roledescription="slide" aria-label={`${position + 1} of ${count}`} aria-hidden={position !== index}>
          {slide.href ? <Link href={slide.href} tabIndex={position === index ? 0 : -1}>{picture}</Link> : picture}
        </div>;
      })}
    </div>
    {count > 1 && <>
      <button type="button" className="slider-arrow prev" aria-label="Previous offer" onClick={() => go(index - 1)}>‹</button>
      <button type="button" className="slider-arrow next" aria-label="Next offer" onClick={() => go(index + 1)}>›</button>
      <button type="button" className="slider-toggle" aria-label={stopped ? "Play slideshow" : "Pause slideshow"} onClick={() => setStopped((value) => !value)}>{stopped ? "▶" : "❚❚"}</button>
      <div className="slider-dots" role="tablist" aria-label="Choose an offer">{slides.map((slide, position) => <button key={slide.id} type="button" role="tab" aria-selected={position === index} aria-label={`Offer ${position + 1}`} className={position === index ? "on" : ""} onClick={() => go(position)} />)}</div>
    </>}
  </section>;
}
