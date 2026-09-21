import { brand } from "@/lib/brand";

// Sign-in / sign-up frame: a colour panel on the left that sells the benefits, the form on the right (stacked on phones).
export function AuthShell({ title, lead, perks, children }: { title: string; lead: string; perks: string[]; children: React.ReactNode }) {
  return <section className="auth-split">
    <div className="auth-card">
      <aside className="auth-side">
        <div>
          <h1>{title}</h1>
          <p className="auth-lead">{lead}</p>
          <ul className="auth-perks">{perks.map((perk) => <li key={perk}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>{perk}</li>)}</ul>
        </div>
        <svg className="auth-art" viewBox="0 0 220 170" aria-hidden="true">
          <circle cx="150" cy="96" r="62" fill="#fb6b48" opacity=".92" />
          <rect x="52" y="14" width="86" height="146" rx="16" fill="#fffdf8" />
          <rect x="60" y="30" width="70" height="104" rx="8" fill="#1c3833" />
          <circle cx="95" cy="146" r="5" fill="#d7f371" />
          <rect x="68" y="42" width="54" height="8" rx="4" fill="#d7f371" />
          <rect x="68" y="58" width="38" height="6" rx="3" fill="#fffdf8" opacity=".55" />
          <rect x="68" y="72" width="54" height="30" rx="6" fill="#fb6b48" opacity=".9" />
          <rect x="68" y="110" width="54" height="14" rx="7" fill="#d7f371" />
          <circle cx="176" cy="34" r="10" fill="#d7f371" />
        </svg>
      </aside>
      <div className="auth-form">{children}</div>
    </div>
  </section>;
}

export const authPerks = [`Track every ${brand.name} order in one place`, "Faster checkout with saved addresses", "Get first access to offers and deals"];
