"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// A thin orange bar that starts the instant a link is tapped and finishes when the next page has arrived,
// so every tap gives immediate feedback even while the page is still loading.
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = []; };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page or just a #anchor
      clear(); setState("loading");
      timers.current.push(window.setTimeout(() => setState("idle"), 15_000)); // never leave the bar hanging
    };
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); clear(); };
  }, []);

  // The new page has arrived: finish the bar, then fade it out.
  useEffect(() => {
    setState((current) => {
      if (current !== "loading") return current;
      clear();
      timers.current.push(window.setTimeout(() => setState("idle"), 420));
      return "done";
    });
  }, [pathname, search]);

  return <div className={`nav-progress ${state}`} aria-hidden="true"><span /></div>;
}
