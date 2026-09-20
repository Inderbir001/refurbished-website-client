"use client";
import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/store/wordmark";

export function AdminTopbar({ email, role }: { email: string; role: string }) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* the redirect below still leaves the page */ }
    window.location.href = "/login";
  }
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <Link href="/admin" className="wordmark"><Wordmark /></Link>
        <span className="admin-tag">Admin</span>
      </div>
      <div className="admin-topbar-right">
        <Link href="/" target="_blank" className="admin-viewstore">View store ↗</Link>
        <span className="admin-user" title={email}><b>{email}</b><small>{role.replace("_", " ").toLowerCase()}</small></span>
        <button type="button" className="admin-signout" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>
      </div>
    </header>
  );
}
