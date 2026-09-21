"use client";
import { useState } from "react";

// What people paste: "+91 70195 49904", "07019549904". Typing is limited to the 10-digit mobile number itself.
function tenDigits(value: string, pasted = false) {
  const digits = value.replace(/\D/g, "");
  if (pasted && digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (pasted && digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(0, 10);
}

export function PhoneField({ name = "phone", label, autoFocus }: { name?: string; label?: string; autoFocus?: boolean }) {
  const [value, setValue] = useState("");
  return <label className="auth-label">{label && <span>{label}</span>}
    <span className="phone-field"><b>+91</b><input required name={name} type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus={autoFocus} placeholder="Enter mobile number" value={value} pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit mobile number" onChange={(event) => setValue(tenDigits(event.target.value))} onPaste={(event) => { event.preventDefault(); setValue(tenDigits(event.clipboardData.getData("text"), true)); }} /></span>
  </label>;
}

export function PasswordField({ name = "password", label = "Password", autoComplete, minLength, hint }: { name?: string; label?: string; autoComplete: string; minLength?: number; hint?: string }) {
  const [shown, setShown] = useState(false);
  return <label className="auth-label"><span>{label}</span>
    <span className="password-field"><input required name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} /><button type="button" onClick={() => setShown((value) => !value)} aria-pressed={shown}>{shown ? "Hide" : "Show"}</button></span>
    {hint && <small>{hint}</small>}
  </label>;
}
