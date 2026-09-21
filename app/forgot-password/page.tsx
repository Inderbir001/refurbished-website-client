"use client";
import Link from "next/link";
import { useState } from "react";
import { AuthShell, authPerks } from "@/components/store/auth-shell";

export default function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(form: FormData) {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email") }) });
      const result = await response.json();
      setMessage(response.ok ? "If the account exists, a reset notification has been queued." : result.error);
      setUrl(result.data?.developmentResetUrl ?? "");
    } catch { setMessage("Could not reach the server. Please try again in a moment."); }
    setBusy(false);
  }
  return <AuthShell title="Forgot your password?" lead="Tell us the email on your account and we will send you a reset link." perks={authPerks}>
    <form onSubmit={(event) => { event.preventDefault(); void submit(new FormData(event.currentTarget)); }}>
      <h2>Reset password</h2>
      <p className="auth-sub">Signed up with only a phone number? Contact support and we will reset it for you.</p>
      <label className="auth-label"><span>Email used on your account</span><input required name="email" type="email" className="auth-input" placeholder="you@example.com" /></label>
      {message && <p className="consent-note" role="status">{message}</p>}
      {url && <Link className="text-link" href={url}>Open local-development reset link</Link>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? "Requesting…" : "Request reset"}</button>
      <p className="auth-foot"><Link href="/login">Back to log in</Link></p>
    </form>
  </AuthShell>;
}
