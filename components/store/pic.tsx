"use client";
import { useEffect, useRef, useState } from "react";
import { thumbUrl, type ThumbSize } from "@/lib/image-url";

// A product photo that loads the small cached copy and quietly falls back to the original if that copy is missing.
export function Pic({ src, size = 480, alt = "", loading = "lazy", priority = false, className }: { src: string; size?: ThumbSize; alt?: string; loading?: "lazy" | "eager"; priority?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // An image that failed before the page finished loading never reports it, so check once on arrival.
  useEffect(() => { const el = ref.current; if (el && el.complete && el.naturalWidth === 0) setFailed(true); }, []);
  return <img ref={ref} src={failed ? src : thumbUrl(src, size)} alt={alt} loading={priority ? "eager" : loading} decoding="async" fetchPriority={priority ? "high" : undefined} className={className} onError={() => setFailed(true)} />;
}
