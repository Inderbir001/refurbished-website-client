"use client";
import { useId, useState } from "react";
import { SECURITY_QUESTIONS } from "@/lib/security-questions";

const CUSTOM = "__custom__";

// Optional at sign-up and collapsed by default (most people skip it), but the one self-service way to reset a
// password without an email — worth surfacing for anyone signing up with just a phone number.
export function SecurityQuestionField({ open: openByDefault = false }: { open?: boolean }) {
  const [open, setOpen] = useState(openByDefault);
  const [choice, setChoice] = useState<string>(SECURITY_QUESTIONS[0]);
  const id = useId();
  if (!open) return <button type="button" className="link-button auth-security-toggle" onClick={() => setOpen(true)}>+ Add a way to recover your password without email</button>;
  return <div className="auth-security">
    <div className="auth-security-head"><b>Recover without email</b><button type="button" className="link-button" onClick={() => setOpen(false)}>Skip this</button></div>
    <p className="auth-sub">Optional. If you ever forget your password and have no email on the account, you can answer this to reset it.</p>
    <label className="auth-label"><span>Security question</span>
      <select name={choice === CUSTOM ? undefined : "securityQuestion"} className="auth-input" value={choice} onChange={(event) => setChoice(event.target.value)}>
        {SECURITY_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
        <option value={CUSTOM}>Write my own question…</option>
      </select>
    </label>
    {choice === CUSTOM && <label className="auth-label"><span className="sr-only">Your question</span><input name="securityQuestion" required maxLength={200} className="auth-input" placeholder="Write your own question" /></label>}
    <label className="auth-label" htmlFor={id}><span>Answer</span><input id={id} name="securityAnswer" required minLength={2} maxLength={200} autoComplete="off" className="auth-input" placeholder="Your answer" /><small>Answer it the same way each time — it's not case sensitive, but the wording should match.</small></label>
  </div>;
}
