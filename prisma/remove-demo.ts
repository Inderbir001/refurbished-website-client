// Removes the demo catalog loaded with `SEED_DEMO_ONLY=1 npm run db:seed`.
// Products that already appear in an order are archived instead of deleted, so order history stays intact.
import { PrismaClient, ProductStatus } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const demo = await db.product.findMany({ where: { tags: { has: "demo-data" } }, select: { id: true, name: true, _count: { select: { orderItems: true } } } });
  const deletable = demo.filter((product) => product._count.orderItems === 0).map((product) => product.id);
  const archived = demo.filter((product) => product._count.orderItems > 0);

  if (deletable.length) {
    await db.cartItem.deleteMany({ where: { productId: { in: deletable } } });
    await db.product.deleteMany({ where: { id: { in: deletable } } });
  }
  for (const product of archived) await db.product.update({ where: { id: product.id }, data: { status: ProductStatus.ARCHIVED, deletedAt: new Date() } });

  console.log(`Demo products found: ${demo.length} | deleted: ${deletable.length} | archived (have orders): ${archived.length}`);
  console.log("Categories, brands, collections and coupons were kept. Remove any you don't want in the admin.");
}

main().then(() => db.$disconnect()).catch(async (error) => { console.error(error.message); await db.$disconnect(); process.exit(1); });
