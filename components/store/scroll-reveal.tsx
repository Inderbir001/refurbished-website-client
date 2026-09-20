"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Two small behaviours for the whole storefront:
//  1. Elements marked data-reveal / data-reveal-group fade up as they scroll into view (children of a group stagger).
//     Anything already on screen is left alone, so there is no flash and nothing is hidden without JavaScript.
//  2. html[data-scrolled] lets the header gain a shadow once the page has moved.
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => { document.documentElement.dataset.scrolled = window.scrollY > 8 ? "true" : "false"; };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove("rv-pending");
        entry.target.classList.add("rv-in");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });

    document.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-group]").forEach((element) => {
      if (element.classList.contains("rv-in") || element.classList.contains("rv-pending")) return;
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) return;
      if (element.hasAttribute("data-reveal-group")) Array.from(element.children).forEach((child, index) => (child as HTMLElement).style.setProperty("--i", String(Math.min(index, 10))));
      element.classList.add("rv-pending");
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
