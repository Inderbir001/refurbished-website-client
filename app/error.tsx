"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="page-shell"><p className="eyebrow">SOMETHING WENT WRONG</p><h1>We could not load this page.</h1><p>Please try again. Your cart and account data are safe.</p><button className="primary-button" onClick={reset}>Try again</button></section>;
}
