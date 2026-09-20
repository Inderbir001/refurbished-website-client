"use client";
import { useState } from "react";

// Phones and tablets: the filter panel is collapsed by default; this button opens and closes it.
export function FiltersToggle() {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className="filters-toggle" aria-expanded={open} onClick={() => { setOpen(!open); document.querySelector(".filters")?.classList.toggle("open"); }}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      {open ? "Hide filters" : "Filters & sort"}
    </button>
  );
}
