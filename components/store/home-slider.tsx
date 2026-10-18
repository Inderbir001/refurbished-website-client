"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type Slide = { id: string; title: string; href: string | null; image: string; mobile: string | null };

// The offers slideshow at the top of the homepage. Pictures come from Admin → Homepage.
// Auto-plays (pauses on hover/touch and for people who prefer less motion), arrows, dots, swipe and arrow keys.
export function HomeSlider({ slides, interval = 5500 }: { slides: Slide[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const count = slides.length;
  const go = useCallback((next: number) => setIndex((next + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => setIndex((current) => (current + 1) % count), interval);
    return () => clearTimeout(timer);
  }, [index, paused, count, interval]);

  if (!count) return null;
  return <section className="slider" aria-roledescription="carousel" aria-label="Current offers"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    onKeyDown={(event) => { if (event.key === "ArrowLeft") go(index - 1); if (event.key === "ArrowRight") go(index + 1); }}
    onTouchStart={(event) => { touch.current = event.touches[0].clientX; setPaused(true); }}
    onTouchEnd={(event) => { const start = touch.current; touch.current = null; setPaused(false); if (start == null) return; const delta = event.changedTouches[0].clientX - start; if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1)); }}>
    <div className="slider-track">
      {slides.map((slide, position) => {
        const picture = <picture>{slide.mobile && <source media="(max-width: 700px)" srcSet={slide.mobile} />}<img src={slide.image} alt={slide.title} loading={position === 0 ? "eager" : "lazy"} draggable={false} /></picture>;
        return <div key={slide.id} className={position === index ? "slide on" : "slide"} role="group" aria-roledescription="slide" aria-label={`${position + 1} of ${count}`} aria-hidden={position !== index}>
          {slide.href ? <Link href={slide.href} tabIndex={position === index ? 0 : -1}>{picture}</Link> : picture}
        </div>;
      })}
    </div>
    {count > 1 && <>
      <button type="button" className="slider-arrow prev" aria-label="Previous offer" onClick={() => go(index - 1)}>‹</button>
      <button type="button" className="slider-arrow next" aria-label="Next offer" onClick={() => go(index + 1)}>›</button>
      <div className="slider-dots" role="tablist" aria-label="Choose an offer">{slides.map((slide, position) => <button key={slide.id} type="button" role="tab" aria-selected={position === index} aria-label={`Offer ${position + 1}`} className={position === index ? "on" : ""} onClick={() => go(position)} />)}</div>
    </>}
  </section>;
}
