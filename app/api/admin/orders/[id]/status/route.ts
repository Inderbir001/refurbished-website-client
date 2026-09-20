import { OrderStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { transitionOrder } from "@/lib/services/order-service";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { try { const admin = await requireAdmin(request, ["SUPER_ADMIN", "ADMIN", "ORDER_MANAGER"]); const input = z.object({ status: z.nativeEnum(OrderStatus) }).parse(await request.json()); return json(await transitionOrder((await context.params).id, input.status, admin.sub)); } catch (error) { return apiError(error); } }
