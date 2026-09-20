import { redirect } from "next/navigation";
import { AccountNav } from "@/components/store/account-nav";
import { ProfileForm } from "@/components/store/profile-form";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function ProfilePage() { const session = await currentSession(); if (!session) redirect("/login"); const user = await db.user.findUniqueOrThrow({ where: { id: session.sub }, select: { name: true, email: true, phone: true } }); return <section className="page-shell"><AccountNav/><p className="eyebrow">ACCOUNT SETTINGS</p><h1>{user.email}</h1><ProfileForm name={user.name} phone={user.phone ?? ""} /></section>; }
