import { NextResponse } from "next/server";
export async function POST() { const response = NextResponse.json({ data: { signedOut: true } }); response.cookies.set({ name: "session", value: "", path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 0 }); return response; }
