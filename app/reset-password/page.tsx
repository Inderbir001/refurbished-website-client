"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell, authPerks } from "@/components/store/auth-shell";
import { PasswordField } from "@/components/store/auth-fields";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(form: FormData) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password: form.get("password") }) });
      const result = await response.json();
      if (response.ok) { setDone(true); setTimeout(() => router.push("/login"), 1500); }
      else setMessage(result.error ?? "This reset link is invalid or expired.");
    } catch { setMessage("Could not reach the server. Please try again in a moment."); }
    setBusy(false);
  }
  return <AuthShell title="Choose a new password" lead="Almost there — set a new password to finish." perks={authPerks}>
    {done
      ? <div><h2>Password reset</h2><p className="auth-sub">You can now sign in with your new password. Taking you to the sign-in page…</p><p className="auth-foot"><Link href="/login">Go to sign in now</Link></p></div>
      : <form onSubmit={(event) => { event.preventDefault(); void submit(new FormData(event.currentTarget)); }}>
          <h2>New password</h2>
          {!token && <p className="form-error" role="alert">This reset link is missing its token. Request a new one from the forgot password page.</p>}
          <PasswordField autoComplete="new-password" minLength={8} label="New password" hint="At least 8 characters" />
          {message && <p className="form-error" role="alert">{message}</p>}
          <button className="primary-button auth-submit" disabled={busy || !token}>{busy ? "Saving…" : "Save password"}</button>
          <p className="auth-foot"><Link href="/forgot-password">Request a new link</Link></p>
        </form>}
  </AuthShell>;
}
export default function ResetPassword() { return <Suspense fallback={<section className="auth-split"><p>Loading…</p></section>}><ResetPasswordForm /></Suspense>; }
