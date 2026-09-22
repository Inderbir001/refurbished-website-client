"use client";
import { useId, useState } from "react";
import { SECURITY_QUESTIONS } from "@/lib/security-questions";

const CUSTOM = "__custom__";

// Every account needs a way to reset its password without waiting on email, so this is required at sign-up
// (mandatory=true, the only mode registration uses). The account-settings page still offers it as an optional
// add/change for accounts that were created before this was required.
export function SecurityQuestionField({ mandatory = false }: { mandatory?: boolean }) {
  const [open, setOpen] = useState(mandatory);
  const [choice, setChoice] = useState<string>(SECURITY_QUESTIONS[0]);
  const id = useId();
  if (!open) return <button type="button" className="link-button auth-security-toggle" onClick={() => setOpen(true)}>+ Add a way to recover your password without email</button>;
  return <div className="auth-security">
    <div className="auth-security-head"><b>Security question</b>{!mandatory && <button type="button" className="link-button" onClick={() => setOpen(false)}>Skip this</button>}</div>
    <p className="auth-sub">Used to reset your password if you ever forget it — required so you can always get back in, even without email.</p>
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
