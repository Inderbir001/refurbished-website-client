import { NextRequest } from "next/server";
import { PaymentStatus, Role } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, AppError, json } from "@/lib/http";
import { buildInvoice } from "@/lib/services/invoice-service";

// The invoice for a paid order: its owner or store staff only. The first request after payment also assigns the
// invoice number, so this is served by the backend (it writes), not by the read-only page layer.
const STAFF: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.ORDER_MANAGER];
const PAID: PaymentStatus[] = [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED];
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const order = await db.order.findUnique({ where: { id: (await context.params).id }, select: { id: true, userId: true, paymentStatus: true } });
    if (!order || (order.userId !== session.sub && !STAFF.includes(session.role))) throw new AppError(404, "Order not found.");
    if (!PAID.includes(order.paymentStatus)) throw new AppError(409, "An invoice is available once the payment is confirmed.");
    return json(await buildInvoice(order.id));
  } catch (error) { return apiError(error); }
}
