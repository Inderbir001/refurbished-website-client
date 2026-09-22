"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, authPerks } from "@/components/store/auth-shell";
import { PhoneField } from "@/components/store/auth-fields";

type Step = "identify" | "no-question" | "answer";

export default function ForgotPassword() {
  const router = useRouter();
  const [useEmail, setUseEmail] = useState(false);
  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitEmail(form: FormData) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email") }) });
      const result = await response.json();
      setMessage(response.ok ? "If the account exists, a reset notification has been queued." : result.error);
      setUrl(result.data?.developmentResetUrl ?? "");
    } catch { setMessage("Could not reach the server. Please try again in a moment."); }
    setBusy(false);
  }
  async function submitPhone(form: FormData) {
    setBusy(true); setMessage("");
    const phone = "+91" + form.get("phone");
    try {
      const response = await fetch("/api/auth/password-reset/question", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: phone }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Could not reach the server."); setBusy(false); return; }
      setIdentifier(phone);
      if (result.data.question) { setQuestion(result.data.question); setStep("answer"); }
      else setStep("no-question");
    } catch { setMessage("Could not reach the server. Please try again in a moment."); }
    setBusy(false);
  }
  async function submitAnswer(form: FormData) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, answer: form.get("answer") }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Could not verify that answer."); setBusy(false); return; }
      router.push(`/reset-password?token=${result.data.token}`);
    } catch { setMessage("Could not reach the server. Please try again in a moment."); setBusy(false); }
  }

  return <AuthShell title="Forgot your password?" lead="We'll get you back into your account." perks={authPerks}>
    {step === "identify" && <form onSubmit={(event) => { event.preventDefault(); void (useEmail ? submitEmail : submitPhone)(new FormData(event.currentTarget)); }}>
      <h2>Reset password</h2>
      <p className="auth-sub">{useEmail ? "Enter the email on your account" : "Enter your phone number — you'll answer your security question next"}</p>
      {useEmail
        ? <label className="auth-label" key="email"><span>Email</span><input required name="email" type="email" className="auth-input" placeholder="you@example.com" /></label>
        : <PhoneField key="phone" />}
      {message && <p className="consent-note" role="status">{message}</p>}
      {url && <Link className="text-link" href={url}>Open local-development reset link</Link>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? "Please wait…" : "Continue"}</button>
      <div className="auth-row"><button type="button" className="link-button" onClick={() => { setUseEmail((value) => !value); setMessage(""); }}>{useEmail ? "Use phone number instead" : "Use Email-ID instead"}</button></div>
      <p className="auth-foot"><Link href="/login">Back to log in</Link></p>
    </form>}

    {step === "no-question" && <div>
      <h2>No security question on file</h2>
      <p className="auth-sub">This phone number doesn&apos;t have a security question set up, so it can&apos;t be reset here. If the account also has an email, try that instead, or contact support and we&apos;ll help you back in.</p>
      <button className="primary-button auth-submit" onClick={() => { setStep("identify"); setMessage(""); }}>Try something else</button>
      <p className="auth-foot"><Link href="/contact">Contact support</Link> · <Link href="/login">Back to log in</Link></p>
    </div>}

    {step === "answer" && <form onSubmit={(event) => { event.preventDefault(); void submitAnswer(new FormData(event.currentTarget)); }}>
      <h2>Answer your security question</h2>
      <p className="auth-sub">{question}</p>
      <label className="auth-label"><span>Answer</span><input required name="answer" autoComplete="off" className="auth-input" placeholder="Your answer" /></label>
      {message && <p className="form-error" role="alert">{message}</p>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? "Checking…" : "Verify answer"}</button>
      <div className="auth-row"><button type="button" className="link-button" onClick={() => { setStep("identify"); setMessage(""); }}>Use a different number</button></div>
    </form>}
  </AuthShell>;
}
