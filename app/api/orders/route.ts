import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";

export async function GET(request: NextRequest) { try { const session = await requireSession(request); return json(await db.order.findMany({ where: { userId: session.sub }, orderBy: { createdAt: "desc" }, include: { items: true, shipment: true, payments: { select: { id: true, gateway: true, status: true, amount: true, createdAt: true } } } })); } catch (error) { return apiError(error); } }
