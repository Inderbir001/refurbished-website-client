import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { InvoiceView } from "@/components/store/invoice-view";
import { currentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function AdminInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  const allowed: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.ORDER_MANAGER];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  const { id } = await params;
  return <InvoiceView orderId={id} backHref={`/admin/orders/${id}`} isAdmin />;
}
