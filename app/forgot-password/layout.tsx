import type { Metadata } from "next";

// The page itself is a client component, so its title (and "keep out of search results") lives here.
export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: true } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
