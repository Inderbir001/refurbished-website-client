import { cache } from "react";
import { db } from "./db";
import { verifySessionLocally } from "./auth";
import { getProduct, listDeals, listProducts, ProductFilters, productCardInclude } from "./catalog";
import { memo } from "./page-memo";
import { backendFetch, decode, encode, isFrontendOnly } from "./remote";
import { cartItemCount } from "./services/cart-service";
import { getAnnouncement } from "./site-content";

// One request per page. In the split deployment (Vercel frontend, Render backend) a page used to ask the backend for
// every database query separately; now the backend gathers everything a page needs next to the database and answers
// once. In single-host mode (local development) the same functions simply run in-process.

async function menuCategories() {
  try {
    const select = { id: true, name: true, slug: true, _count: { select: { products: true } } } as const;
    const orderBy = [{ position: "asc" as const }, { name: "asc" as const }];
    let rows = await db.category.findMany({ where: { isVisible: true, parentId: { not: null } }, select, orderBy });
    if (!rows.length) rows = await db.category.findMany({ where: { isVisible: true }, select, orderBy });
    return rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug, count: row._count.products }));
  } catch { return []; }
}

export const pageLoaders = {
  // Everything the store header shows: who is signed in, the cart count, the category menu and the top bar text.
  async header(args: { token?: string; guest?: string }) {
    const session = args.token ? await verifySessionLocally(args.token) : null;
    const actor = session ? { userId: session.sub } : args.guest ? { sessionToken: args.guest } : null;
    const [count, categories, announcement] = await Promise.all([
      actor ? cartItemCount(actor).catch(() => 0) : Promise.resolve(0),
      memo("header:categories", menuCategories),
      memo("header:announcement", getAnnouncement),
    ]);
    return { session, count, categories, announcement };
  },

  home: () => memo("home", async () => {
    const now = new Date();
    const [store, sections, banners, deals, coupons, collections] = await Promise.all([
      db.store.findFirst({ include: { settings: true } }),
      db.homepageSection.findMany({ where: { isVisible: true }, orderBy: { position: "asc" } }),
      db.homepageBanner.findMany({ where: { isVisible: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { position: "asc" } }),
      listDeals(),
      db.coupon.findMany({ where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, orderBy: { createdAt: "desc" }, take: 12 }),
      db.collection.findMany({ where: { isActive: true, products: { some: { product: { status: "ACTIVE", deletedAt: null } } } }, include: { products: { where: { product: { status: "ACTIVE", deletedAt: null } }, orderBy: { position: "asc" }, take: 4, include: { product: { include: productCardInclude } } } }, orderBy: { createdAt: "asc" }, take: 3 }),
    ]);
    return { store, sections, banners, deals, coupons, collections };
  }),

  products: (filters: ProductFilters) => memo(`products:${JSON.stringify(filters)}`, async () => {
    const [products, categories, brands] = await Promise.all([
      listProducts(filters),
      db.category.findMany({ where: { isVisible: true, products: { some: { status: "ACTIVE" } } }, orderBy: { position: "asc" } }),
      db.brand.findMany({ where: { isActive: true, products: { some: { status: "ACTIVE" } } }, orderBy: { name: "asc" } }),
    ]);
    return { products, categories, brands };
  }),

  category: (args: { slug: string }) => memo(`category:${args.slug}`, async () => {
    const [category, products] = await Promise.all([db.category.findFirst({ where: { slug: args.slug, isVisible: true } }), listProducts({ category: args.slug })]);
    return { category, products };
  }),

  // The product itself is public; whether this visitor may review it depends on who they are.
  async product(args: { slug: string; token?: string }) {
    const [product, session] = await Promise.all([memo(`product:${args.slug}`, () => getProduct(args.slug)), args.token ? verifySessionLocally(args.token) : Promise.resolve(null)]);
    const canReview = product && session ? Boolean(await db.orderItem.findFirst({ where: { productId: product.id, order: { userId: session.sub, status: "DELIVERED", paymentStatus: "SUCCESS" } }, select: { id: true } })) : false;
    return { product, canReview };
  },
};

export type PageName = keyof typeof pageLoaders;
type LoaderArgs<K extends PageName> = Parameters<(typeof pageLoaders)[K]>[0];
type LoaderResult<K extends PageName> = Awaited<ReturnType<(typeof pageLoaders)[K]>>;

// Runs a loader on the machine that holds the database (the backend, or this process when there is no split).
export function runPage(name: string, args: unknown) {
  const loader = (pageLoaders as Record<string, (input: unknown) => Promise<unknown>>)[name];
  if (!Object.hasOwn(pageLoaders, name) || typeof loader !== "function") throw new Error(`Unknown page data "${name}".`);
  return loader(args ?? {});
}

// The same page asked twice in one render (e.g. metadata and the page itself) makes one request.
const fetchPage = cache(async (name: string, argsJson: string): Promise<unknown> => {
  const args = JSON.parse(argsJson);
  if (!isFrontendOnly()) return runPage(name, args);
  const response = await backendFetch("/api/internal/page", { body: encode({ name, args }) });
  // The backend has not been updated yet (a deploy is in progress): do it the old way, query by query, so pages keep working.
  if (response.status === 404) return runPage(name, args);
  const payload = decode<{ result?: unknown; error?: { message?: string } }>(await response.text());
  if (!response.ok || payload.error) throw new Error(payload.error?.message ?? `Page data request failed (${response.status}).`);
  return payload.result;
});

export function pageData<K extends PageName>(name: K, args?: LoaderArgs<K>): Promise<LoaderResult<K>> {
  return fetchPage(name, JSON.stringify(args ?? {})) as Promise<LoaderResult<K>>;
}
