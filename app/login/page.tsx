"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { brand } from "@/lib/brand";
import { AuthShell, authPerks } from "@/components/store/auth-shell";
import { PasswordField, PhoneField } from "@/components/store/auth-fields";

// Only send people to pages on this site after signing in.
const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : null);

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [useEmail, setUseEmail] = useState(false);
  async function login(form: FormData) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: form.get(useEmail ? "email" : "phone"), password: form.get("password") }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Could not sign in."); setBusy(false); return; }
      router.push(data.data.role === "CUSTOMER" ? (next ?? "/") : "/admin");
      router.refresh();
    } catch { setError("Could not reach the server. Please try again in a moment."); setBusy(false); }
  }
  return <AuthShell title="Login" lead="Sign in to see your orders, offers and saved details." perks={authPerks}>
    <form onSubmit={(event) => { event.preventDefault(); void login(new FormData(event.currentTarget)); }}>
      <h2>Log in for the best experience</h2>
      <p className="auth-sub">{useEmail ? "Enter your email and password to continue" : "Enter your phone number and password to continue"}</p>
      {useEmail
        ? <label className="auth-label"><span className="sr-only">Email</span><input required key="email" name="email" type="email" autoComplete="username" placeholder="Enter email" className="auth-input" /></label>
        : <PhoneField key="phone" />}
      <PasswordField autoComplete="current-password" />
      <div className="auth-row"><button type="button" className="link-button" onClick={() => { setUseEmail((value) => !value); setError(""); }}>{useEmail ? "Use phone number" : "Use Email-ID"}</button><Link href="/forgot-password">Forgot password?</Link></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? "Signing in…" : "Login"}</button>
      <p className="auth-foot">New to {brand.name}? <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>Create an account</Link></p>
    </form>
  </AuthShell>;
}
export default function Login() { return <Suspense fallback={<section className="auth-split"><p>Loading…</p></section>}><LoginForm /></Suspense>; }
