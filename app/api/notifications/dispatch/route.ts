import { NextRequest } from "next/server";
import { apiError, AppError, json } from "@/lib/http";
import { dispatchPendingNotifications } from "@/lib/notifications/service";
export async function POST(request: NextRequest) { try { const secret = process.env.CRON_SECRET; if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) throw new AppError(401, "Invalid dispatcher credential."); return json({ processed: (await dispatchPendingNotifications()).length }); } catch (error) { return apiError(error); } }
