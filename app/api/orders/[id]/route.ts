import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) { try { const session = await requireSession(request); const order = await db.order.findFirst({ where: { id: (await context.params).id, userId: session.sub }, include: { items: true, shipment: true, payments: { select: { id: true, gateway: true, status: true, amount: true, createdAt: true } }, refunds: true } }); if (!order) throw new AppError(404, "Order not found."); return json(order); } catch (error) { return apiError(error); } }
