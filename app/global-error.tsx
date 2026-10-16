"use client";

// Last-resort screen for a failure in the page frame itself (header/footer/layout). It replaces the whole document, so
// it carries its own minimal styling.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f6f1", color: "#14211f", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
    <main style={{ maxWidth: 460 }}>
      <p style={{ letterSpacing: ".1em", fontSize: 12, color: "#60706c" }}>SOMETHING WENT WRONG</p>
      <h1 style={{ fontSize: 32, margin: "8px 0 12px" }}>We could not load the store.</h1>
      <p style={{ color: "#60706c", lineHeight: 1.5 }}>Please try again in a moment. Your cart and account are safe, and no payment is taken without your confirmation.</p>
      <button onClick={reset} style={{ marginTop: 18, padding: "13px 24px", border: 0, borderRadius: 12, background: "#14211f", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Try again</button>
    </main>
  </body></html>;
}
