"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell, authPerks } from "@/components/store/auth-shell";
import { PasswordField, PhoneField } from "@/components/store/auth-fields";
import { SecurityQuestionField } from "@/components/store/security-question-field";

const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : null);

function RegisterForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function register(form: FormData) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Could not create the account."); setBusy(false); return; }
      router.push(next ?? "/"); router.refresh();
    } catch { setError("Could not reach the server. Please try again in a moment."); setBusy(false); }
  }
  return <AuthShell title="Looks like you're new here!" lead="Create your account with your phone number to check out and track your orders." perks={authPerks}>
    <form onSubmit={(event) => { event.preventDefault(); void register(new FormData(event.currentTarget)); }}>
      <h2>Create your account</h2>
      <p className="auth-sub">It takes less than a minute</p>
      <label className="auth-label"><span>Name</span><input required name="name" autoComplete="name" className="auth-input" placeholder="Your full name" /></label>
      <PhoneField label="Phone number" />
      <label className="auth-label"><span>Email <em>(optional)</em></span><input name="email" type="email" autoComplete="email" className="auth-input" placeholder="you@example.com" /></label>
      <PasswordField autoComplete="new-password" minLength={8} label="Create password" hint="At least 8 characters" />
      <SecurityQuestionField />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      <p className="consent-note">By continuing, you agree to our <Link href="/policies/terms-and-conditions">Terms &amp; Conditions</Link> and <Link href="/policies/privacy-policy">Privacy Policy</Link>.</p>
      <p className="auth-foot">Already have an account? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Log in</Link></p>
    </form>
  </AuthShell>;
}
export default function Register() { return <Suspense fallback={<section className="auth-split"><p>Loading…</p></section>}><RegisterForm /></Suspense>; }
