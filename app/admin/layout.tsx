import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { AdminNav } from "@/components/admin/admin-nav";
import { currentSession } from "@/lib/auth";
import "../admin-ui.css";
import { AdminTopbar } from "@/components/admin/admin-topbar";

const staff: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER, Role.ORDER_MANAGER];

// One consistent frame (sidebar + content) for every admin page, so nothing is ever more than a click away.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session || !staff.includes(session.role)) redirect("/login");
  return <div className="admin-root"><AdminTopbar email={session.email} role={session.role} /><div className="admin-frame"><AdminNav /><div className="admin-content">{children}</div></div></div>;
}
