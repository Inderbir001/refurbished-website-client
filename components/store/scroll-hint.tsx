"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// A soft shadow along the bottom of the screen while there is more page below, so people know to keep scrolling.
// It fades away near the end of the page, and is never shown in the admin area.
export function ScrollHint() {
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (pathname.startsWith("/admin")) { setOn(false); return; }
    const check = () => { const root = document.documentElement; setOn(root.scrollHeight - (window.scrollY + window.innerHeight) > 140); };
    check();
    const timer = window.setTimeout(check, 700); // the page may still be growing (pictures, streamed sections)
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    observer?.observe(document.body);
    return () => { window.clearTimeout(timer); window.removeEventListener("scroll", check); window.removeEventListener("resize", check); observer?.disconnect(); };
  }, [pathname]);
  return <div className={on ? "scroll-hint on" : "scroll-hint"} aria-hidden="true" />;
}
