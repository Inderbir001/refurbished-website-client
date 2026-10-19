import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./filters.css";
import "./account.css";
import "./cart-extra.css";
import "./admin-extra.css";
import "./header.css";
import "./home.css";
import "./order.css";
import "./offers-admin.css";
import "./storefront-admin.css";
import "./premium.css";
import "./content-pages.css";
import "./storefront-pro.css";
import "./auth.css";
import "./motion.css";
import { Header } from "@/components/store/header";
import { brand } from "@/lib/brand";
import { Footer } from "@/components/store/footer";
import { ScrollReveal } from "@/components/store/scroll-reveal";
import { StoreChrome } from "@/components/store/store-chrome";
import { CookieBanner } from "@/components/store/cookie-banner";
// Fonts are served from our own domain (no render-blocking request to Google): Inter for text, Plus Jakarta Sans for headings.
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const head = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-head", display: "swap", weight: ["500", "600", "700", "800"] });
// Split deployment: a free Render backend can take ~30-50s to wake, so give pages time to wait for it.
export const maxDuration = 60;
export const metadata: Metadata = { title: { default: `${brand.name} | ${brand.tagline}`, template: `%s | ${brand.name}` }, description: "New, certified refurbished and pre-owned electronics with transparent condition checks.", metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") };
// The admin panel has its own top bar: do not even load the store header and footer for it.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const inAdmin = ((await headers()).get("x-app-path") ?? "").startsWith("/admin");
  return <html lang="en" className={`${body.variable} ${head.variable}`}><body><div className="scroll-progress" aria-hidden="true" /><ScrollReveal /><StoreChrome header={inAdmin ? null : <Header />} footer={inAdmin ? null : <><Footer /><CookieBanner /></>}>{children}</StoreChrome></body></html>;
}
