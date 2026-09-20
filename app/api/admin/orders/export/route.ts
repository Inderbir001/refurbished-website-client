import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { csvCell } from "@/lib/csv";
export async function GET(request: NextRequest) { try { await requireAdmin(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.ORDER_MANAGER]); const orders = await db.order.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } }); const rows = [["orderNumber","customer","email","status","paymentStatus","subtotal","discount","shipping","tax","total","createdAt"], ...orders.map((order) => [order.orderNumber, order.user?.name ?? "Guest", order.user?.email ?? "", order.status, order.paymentStatus, order.subtotal, order.discount, order.shippingAmount, order.taxAmount, order.total, order.createdAt.toISOString()])]; return new NextResponse(rows.map((row) => row.map(csvCell).join(",")).join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=refurbshield-orders.csv" } }); } catch (error) { return apiError(error); } }
