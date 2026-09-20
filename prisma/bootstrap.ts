// Production bootstrap: creates the store record, GST rule and the first Super Admin — with NO demo data.
// Safe to run more than once (it updates instead of duplicating). Unlike `db:seed`, the admin password comes
// from your environment, never from the source code.
//
//   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a-long-passphrase' STORE_NAME='My Store' HOME_STATE='Karnataka' npm run db:bootstrap
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const db = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  const email = required("ADMIN_EMAIL").toLowerCase();
  const password = required("ADMIN_PASSWORD");
  const storeName = required("STORE_NAME");
  const homeState = required("HOME_STATE");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("ADMIN_EMAIL is not a valid email address.");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");

  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "store";
  const existing = await db.store.findFirst();
  const store = existing ?? await db.store.create({ data: { name: storeName, slug } });
  if (existing && existing.name !== storeName) await db.store.update({ where: { id: existing.id }, data: { name: storeName } });

  await db.storeSettings.upsert({ where: { storeId: store.id }, update: { supportEmail: email }, create: { storeId: store.id, supportEmail: email, address: { state: homeState, country: "India" }, defaultTaxRate: 18, freeShippingThreshold: 49900, returnDays: 7, paymentConfig: { razorpayEnabled: true, phonePeEnabled: false, snapmitEnabled: false, sandboxMode: true } } });

  const taxRule = await db.taxRule.findFirst({ where: { storeId: store.id } });
  if (taxRule) await db.taxRule.update({ where: { id: taxRule.id }, data: { homeState, isActive: true } });
  else await db.taxRule.create({ data: { storeId: store.id, name: "Standard electronics GST", rate: 18, homeState, isActive: true } });

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await db.user.upsert({ where: { email }, update: { passwordHash, role: Role.SUPER_ADMIN, isActive: true }, create: { email, name: "Store Owner", passwordHash, role: Role.SUPER_ADMIN } });

  console.log(`Store "${store.name}" is ready. Super Admin: ${admin.email}. GST home state: ${homeState}.`);
  console.log("Next: sign in at /login, add categories and products under /admin, and delete any other admin accounts.");
}

main().then(() => db.$disconnect()).catch(async (error) => { console.error(error.message); await db.$disconnect(); process.exit(1); });
