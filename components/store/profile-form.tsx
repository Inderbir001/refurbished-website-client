"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SECURITY_QUESTIONS } from "@/lib/security-questions";

const CUSTOM = "__custom__";

export function ProfileForm({ name, phone, securityQuestion }: { name: string; phone: string; securityQuestion: string | null }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [editingSecurity, setEditingSecurity] = useState(!securityQuestion);
  const [choice, setChoice] = useState<string>(securityQuestion && !(SECURITY_QUESTIONS as readonly string[]).includes(securityQuestion) ? CUSTOM : securityQuestion || SECURITY_QUESTIONS[0]);

  async function save(form: FormData) {
    const body: Record<string, FormDataEntryValue> = {};
    for (const [key, value] of form) if (value !== "") body[key] = value;
    const response = await fetch("/api/account/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setMessage(response.ok ? "Profile saved." : result.error ?? "Could not save profile.");
    if (response.ok) { setEditingSecurity(!result.data.securityQuestion); router.refresh(); }
  }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }

  return <div className="profile-grid">
    <form onSubmit={(event) => { event.preventDefault(); void save(new FormData(event.currentTarget)); }} className="product-form">
      <h2>Profile</h2>
      <label>Name<input name="name" defaultValue={name} required /></label>
      <label>Mobile<input name="phone" defaultValue={phone} /></label>

      <h3>Password recovery</h3>
      {/* Mandatory: every account has one, and there is no "remove" — only add (if missing) or change it. */}
      {securityQuestion && !editingSecurity && <p className="tax-note">Security question set: <b>{securityQuestion}</b>. <button type="button" className="link-button" onClick={() => setEditingSecurity(true)}>Change it</button></p>}
      {(!securityQuestion || editingSecurity) && <>
        <label>{securityQuestion ? "New security question" : "Add a security question"}<select name={choice === CUSTOM ? undefined : "securityQuestion"} value={choice} onChange={(event) => setChoice(event.target.value)}>{SECURITY_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}<option value={CUSTOM}>Write my own question…</option></select></label>
        {choice === CUSTOM && <label>Your question<input name="securityQuestion" required maxLength={200} placeholder="Write your own question" /></label>}
        <label>Answer<input name="securityAnswer" required minLength={2} maxLength={200} autoComplete="off" /></label>
        {securityQuestion && <button type="button" className="link-button" onClick={() => setEditingSecurity(false)}>Cancel</button>}
      </>}
      <small className="hint">Lets you reset your password without email — every account is required to have one.</small>

      <h3>Change password</h3>
      <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" /></label>
      <label>New password<input name="newPassword" type="password" minLength={8} autoComplete="new-password" /></label>
      <small className="hint">Also needed above to set or change your security question.</small>

      <button className="primary-button">Save profile</button>
      {message && <p aria-live="polite">{message}</p>}
    </form>
    <div><button className="secondary-button" onClick={logout}>Sign out</button></div>
  </div>;
}
