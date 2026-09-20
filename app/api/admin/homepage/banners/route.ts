import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, json } from "@/lib/http";

const roles = [Role.SUPER_ADMIN, Role.ADMIN];
const target = z.object({ id: z.string().min(1).max(64) });

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request, roles);
    const input = target.extend({ isVisible: z.boolean().optional(), position: z.number().int().min(0).optional() }).parse(await request.json());
    const banner = await db.homepageBanner.update({ where: { id: input.id }, data: { isVisible: input.isVisible, position: input.position } });
    await db.auditLog.create({ data: { actorId: admin.sub, action: "HOMEPAGE_BANNER_UPDATED", entityType: "HomepageBanner", entityId: banner.id, after: { isVisible: banner.isVisible, position: banner.position } } });
    return json(banner);
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request, roles);
    const { id } = target.parse(await request.json());
    await db.homepageBanner.delete({ where: { id } });
    await db.auditLog.create({ data: { actorId: admin.sub, action: "HOMEPAGE_BANNER_DELETED", entityType: "HomepageBanner", entityId: id } });
    return json({ deleted: true });
  } catch (error) { return apiError(error); }
}
