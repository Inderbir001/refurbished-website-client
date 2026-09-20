"use client";
import { usePathname } from "next/navigation";

// The storefront header/footer belong to the shop, not the admin panel, which has its own top bar.
export function StoreChrome({ header, footer, children }: { header: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const inAdmin = usePathname().startsWith("/admin");
  return <>{!inAdmin && header}<main>{children}</main>{!inAdmin && footer}</>;
}
