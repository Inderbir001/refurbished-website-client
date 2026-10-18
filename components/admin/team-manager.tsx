"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/lib/safe-fetch";

export type Member = { id: string; name: string; contact: string; role: string; isActive: boolean };
const ROLES: [string, string, string][] = [
  ["SUPER_ADMIN", "Owner", "Can do everything, including managing the team."],
  ["ADMIN", "Admin", "Manages products, orders, settings and offers. Cannot manage the team."],
  ["PRODUCT_MANAGER", "Product manager", "Products, stock and images only."],
  ["ORDER_MANAGER", "Order manager", "Orders, payments and delivery only."],
];
const roleName = (role: string) => ROLES.find(([value]) => value === role)?.[1] ?? role;

// Admin → Team: only people who can sign in to the admin. Customers are on the Customers page.
export function TeamManager({ members, me, canManage }: { members: Member[]; me: string; canManage: boolean }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(method: "POST" | "PATCH", body: object, key: string, done: string) {
    setBusy(key); setNote(null);
    const response = await safeFetch("/api/admin/users", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setBusy(null);
    setNote(response.ok ? { ok: true, text: done } : { ok: false, text: result.error ?? "That could not be saved." });
    if (response.ok) { router.refresh(); return true; }
    return false;
  }

  return <>
    {note && <p className={`adm-banner ${note.ok ? "ok" : "bad"}`} role="status">{note.text}</p>}
    {canManage && <form className="adm-card" onSubmit={async (event) => { event.preventDefault(); if (await call("POST", { identifier, role }, "add", "Added to the team. They can sign in with their usual login and will see the admin.")) setIdentifier(""); }}>
      <h2>Add a team member<small className="adm-card-sub">They must already have an account on your shop (they can sign up as a customer first). Enter the email or phone number they used.</small></h2>
      <div className="adm-grid">
        <label className="adm-field">Email or phone number<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="name@example.com or 98765 43210" required minLength={3} /></label>
        <label className="adm-field">What can they do?<select value={role} onChange={(event) => setRole(event.target.value)}>{ROLES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select><small>{ROLES.find(([value]) => value === role)?.[2]}</small></label>
      </div>
      <div><button className="adm-btn primary" disabled={busy === "add"}>{busy === "add" ? "Adding…" : "Give access"}</button></div>
    </form>}

    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>Name</th><th>Contact</th><th>Access</th><th>Status</th>{canManage && <th />}</tr></thead>
        <tbody>
          {members.map((member) => {
            const self = member.id === me;
            return <tr key={member.id}>
              <td><b>{member.name}</b>{self && <span className="adm-pill muted" style={{ marginLeft: 8 }}>You</span>}</td>
              <td><small>{member.contact}</small></td>
              <td>{canManage && !self
                ? <select aria-label={`Access for ${member.name}`} value={member.role} disabled={busy === member.id} onChange={(event) => call("PATCH", { id: member.id, role: event.target.value }, member.id, "Access updated.")} style={{ padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 10, background: "#fff", font: "600 13px var(--font-body), sans-serif" }}>{ROLES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select>
                : roleName(member.role)}</td>
              <td><span className={`adm-pill ${member.isActive ? "ok" : "muted"}`}>{member.isActive ? "Active" : "Switched off"}</span></td>
              {canManage && <td className="r">{!self && <span style={{ display: "inline-flex", gap: 8 }}>
                <button type="button" className="adm-btn small ghost" disabled={busy === member.id} onClick={() => call("PATCH", { id: member.id, isActive: !member.isActive }, member.id, member.isActive ? "Switched off. They can no longer sign in." : "Switched on.")}>{member.isActive ? "Switch off" : "Switch on"}</button>
                <button type="button" className="adm-btn small danger" disabled={busy === member.id} onClick={() => { if (confirm(`Remove ${member.name} from the team? They keep their shopping account but lose admin access.`)) void call("PATCH", { id: member.id, role: "CUSTOMER" }, member.id, "Removed from the team."); }}>Remove</button>
              </span>}</td>}
            </tr>;
          })}
          {!members.length && <tr><td colSpan={5}><div className="adm-empty"><b>No team members</b></div></td></tr>}
        </tbody>
      </table>
    </div>
    <p className="adm-hint">Looking for shoppers? They are listed on the Customers page.</p>
  </>;
}
