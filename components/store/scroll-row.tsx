"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// A sideways-scrolling row (products, categories). Swipe on phones, arrow buttons on computers.
export function ScrollRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const move = (direction: 1 | -1) => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.85, behavior: "smooth" });

  return <div className={`srow ${className}`.trim()}>
    <button type="button" className="srow-btn prev" aria-label="Scroll back" onClick={() => move(-1)} disabled={edge.start} tabIndex={edge.start ? -1 : 0}>‹</button>
    <div className="srow-track" ref={track} onScroll={measure}>{children}</div>
    <button type="button" className="srow-btn next" aria-label="Scroll forward" onClick={() => move(1)} disabled={edge.end} tabIndex={edge.end ? -1 : 0}>›</button>
  </div>;
}
