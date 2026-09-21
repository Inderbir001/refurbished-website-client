"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

// Only send people to pages on this site after signing in.
const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : null);

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(form: FormData) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Could not sign in."); setBusy(false); return; }
      router.push(data.data.role === "CUSTOMER" ? (next ?? "/") : "/admin");
      router.refresh();
    } catch { setError("Could not reach the server. Please try again in a moment."); setBusy(false); }
  }
  return <section className="auth-page"><form onSubmit={(event) => { event.preventDefault(); void login(new FormData(event.currentTarget)); }}>
    <p className="eyebrow">WELCOME BACK</p><h1>Sign in</h1>
    <label>Phone number or email<input required name="identifier" autoComplete="username" placeholder="10-digit mobile number" /></label>
    <label>Password<input required type="password" name="password" autoComplete="current-password" /></label>
    {error && <p className="form-error">{error}</p>}
    <button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    <p><Link href="/forgot-password">Forgot password?</Link></p>
    <p>New here? <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>Create an account</Link></p>
  </form></section>;
}
export default function Login() { return <Suspense fallback={<section className="auth-page"><p>Loading…</p></section>}><LoginForm /></Suspense>; }
