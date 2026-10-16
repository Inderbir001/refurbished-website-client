import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { InvoiceView } from "@/components/store/invoice-view";
import { currentSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  return <InvoiceView orderId={id} backHref={`/account/orders/${id}`} />;
}
