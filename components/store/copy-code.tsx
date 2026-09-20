"use client";
import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
  }
  return <button type="button" className="coupon-code" onClick={copy} aria-label={`Copy coupon code ${code}`}>{copied ? "Copied ✓" : code}</button>;
}
