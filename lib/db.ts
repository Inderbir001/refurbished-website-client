import { PrismaClient } from "@prisma/client";
import { backendUrl } from "./remote";
import { createRemoteDb } from "./remote-db";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };
// On the frontend of a split deployment (BACKEND_URL set) reads go through the backend; everywhere else this is the real client.
const create = () => (backendUrl() ? createRemoteDb() : new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] }));
export const db = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
