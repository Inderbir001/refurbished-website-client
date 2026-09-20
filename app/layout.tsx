import type { Metadata } from "next";
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
import { Header } from "@/components/store/header";
import { brand } from "@/lib/brand";
import { Footer } from "@/components/store/footer";
import { ScrollReveal } from "@/components/store/scroll-reveal";
import { StoreChrome } from "@/components/store/store-chrome";
export const metadata: Metadata = { title: { default: `${brand.name} | ${brand.tagline}`, template: `%s | ${brand.name}` }, description: "New, certified refurbished and pre-owned electronics with transparent condition checks.", metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><div className="scroll-progress" aria-hidden="true" /><ScrollReveal /><StoreChrome header={<Header />} footer={<Footer />}>{children}</StoreChrome></body></html>; }
