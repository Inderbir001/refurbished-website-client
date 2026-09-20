import { redirect } from "next/navigation";
import { AccountNav } from "@/components/store/account-nav";
import { AddressManager } from "@/components/store/address-manager";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Addresses() { const session = await currentSession(); if (!session) redirect("/login"); const addresses = await db.address.findMany({ where: { userId: session.sub }, orderBy: { isDefault: "desc" } }); return <section className="page-shell"><AccountNav /><p className="eyebrow">DELIVERY</p><h1>Addresses</h1><AddressManager addresses={addresses} /></section>; }
