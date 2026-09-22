import { NextRequest } from "next/server";
import { PaymentGateway } from "@prisma/client";
import { z } from "zod";
import { sessionFromRequest } from "@/lib/auth";
import { apiError, AppError, json } from "@/lib/http";
import { indianPhone } from "@/lib/phone";
import { createOrder } from "@/lib/services/order-service";
const addressSchema = z.object({ name: z.string().min(2), phone: indianPhone, line1: z.string().min(4), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), pincode: z.string().regex(/^\d{6}$/) });
const bodySchema = z.object({ gateway: z.nativeEnum(PaymentGateway), idempotencyKey: z.string().uuid(), address: addressSchema, billingAddress: addressSchema.optional(), shippingRuleId: z.string().cuid().optional() });
export async function POST(request: NextRequest) { try { const input = bodySchema.parse(await request.json()); const session = await sessionFromRequest(request); if (!session) throw new AppError(401, "Please sign in or create an account to check out."); const order = await createOrder({ userId: session.sub }, input.address, input.gateway, input.idempotencyKey, input.billingAddress, input.shippingRuleId); return json({ orderId: order.id, orderNumber: order.orderNumber, confirmationToken: order.confirmationToken, paymentId: order.payments[0].id, total: order.total }, 201); } catch (error) { return apiError(error); } }
