"use client";
import { useEffect } from "react";

// html[data-scrolled] lets the header gain a shadow once the page has moved.
// (Sections and cards rise into view with a pure CSS scroll timeline in motion.css, so nothing here touches the page's markup.)
export function ScrollReveal() {
  useEffect(() => {
    const onScroll = () => { document.documentElement.dataset.scrolled = window.scrollY > 8 ? "true" : "false"; };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
