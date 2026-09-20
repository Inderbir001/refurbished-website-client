import { NextRequest } from "next/server";
import { apiError, AppError, json } from "@/lib/http";
import { releaseExpiredReservations } from "@/lib/services/reservation-service";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) throw new AppError(401, "Invalid maintenance credentials.");
    const released = await releaseExpiredReservations();
    return json({ released: released.length, orderIds: released });
  } catch (error) { return apiError(error); }
}
