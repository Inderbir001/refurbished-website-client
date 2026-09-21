"use client";
import { useState } from "react";

// What people type or paste: "+91 70195 49904", "07019549904". Only the 10-digit mobile number itself is kept.
function tenDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  return digits.slice(0, 10);
}

export function PhoneField({ name = "phone", label, autoFocus }: { name?: string; label?: string; autoFocus?: boolean }) {
  const [value, setValue] = useState("");
  return <label className="auth-label">{label && <span>{label}</span>}
    <span className="phone-field"><b>+91</b><input required name={name} type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus={autoFocus} placeholder="Enter mobile number" value={value} pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit mobile number" onChange={(event) => setValue(tenDigits(event.target.value))} onPaste={(event) => { event.preventDefault(); setValue(tenDigits(event.clipboardData.getData("text"))); }} /></span>
  </label>;
}

export function PasswordField({ name = "password", label = "Password", autoComplete, minLength, hint }: { name?: string; label?: string; autoComplete: string; minLength?: number; hint?: string }) {
  const [shown, setShown] = useState(false);
  return <label className="auth-label"><span>{label}</span>
    <span className="password-field"><input required name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} /><button type="button" onClick={() => setShown((value) => !value)} aria-pressed={shown}>{shown ? "Hide" : "Show"}</button></span>
    {hint && <small>{hint}</small>}
  </label>;
}
