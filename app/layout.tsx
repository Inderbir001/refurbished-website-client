import type { Metadata } from "next";
import "./globals.css";
import "./filters.css";
import "./account.css";
import "./cart-extra.css";
import "./admin-extra.css";
import { Header } from "@/components/store/header";
export const metadata: Metadata = { title: { default: "RefurbShield | Electronics you can trust", template: "%s | RefurbShield" }, description: "New, certified refurbished and pre-owned electronics with transparent condition checks.", metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Header /><main>{children}</main><footer><div className="wordmark">refurb<span>shield</span></div><p>Better devices. Less waste. Every order is checked before it ships.</p><div>Secure payments · Tracked delivery · Support when you need it</div></footer></body></html>; }
