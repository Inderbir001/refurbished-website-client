import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getCapabilities } from "@/lib/capabilities";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Checkout() { const session = await currentSession(); if (!session) redirect("/register?next=/checkout"); const [addresses, store, ready] = await Promise.all([db.address.findMany({ where: { userId: session.sub }, orderBy: [{ isDefault: "desc" }, { id: "asc" }] }), db.store.findFirst({ include: { settings: true } }), getCapabilities()]); const config = (store?.settings?.paymentConfig ?? {}) as { razorpayEnabled?: boolean; phonePeEnabled?: boolean; snapmitEnabled?: boolean }; const gateways = [{ id: "RAZORPAY", label: "Razorpay secure checkout", available: (config.razorpayEnabled ?? true) && ready.razorpay, reason: "Add Razorpay credentials to activate." }, { id: "PHONEPE", label: "PhonePe hosted checkout", available: (config.phonePeEnabled ?? false) && ready.phonepe, reason: "Enable PhonePe and add merchant credentials." }, { id: "SNAPMIT", label: "Snapmint EMI", available: false, reason: "Requires Snapmint merchant credentials and the private integration contract." }]; return <CheckoutForm addresses={addresses} gateways={gateways} />; }
