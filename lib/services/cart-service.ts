import { Prisma } from "@prisma/client";
import { db } from "../db";
import { AppError } from "../http";
import { priceFor } from "../money";
import { calculateCheckoutTotals } from "./pricing-service";
import { CouponLine, validateCouponForCart } from "./coupon-service";

export type CartActor = { userId?: string; sessionToken?: string };
const cartInclude = { items: { include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 }, brand: true, collections: { select: { collectionId: true } } } }, variant: true } } } satisfies Prisma.CartInclude;
export async function getOrCreateCart(actor: CartActor) {
  if (!actor.userId && !actor.sessionToken) throw new AppError(400, "Cart identity is missing.");
  const where: Prisma.CartWhereUniqueInput = actor.userId ? { userId: actor.userId } : { sessionToken: actor.sessionToken! };
  return db.cart.upsert({ where, update: {}, create: actor.userId ? { userId: actor.userId } : { sessionToken: actor.sessionToken! }, include: cartInclude });
}
export async function getCart(actor: CartActor) { return getOrCreateCart(actor); }
export async function addCartItem(actor: CartActor, input: { productId: string; variantId?: string; quantity: number }) {
  const cart = await getOrCreateCart(actor);
  const product = await db.product.findFirst({ where: { id: input.productId, status: "ACTIVE", deletedAt: null }, include: { variants: true } });
  if (!product) throw new AppError(404, "This product is no longer available.");
  const variant = input.variantId ? product.variants.find((item) => item.id === input.variantId) : product.variants[0];
  if (!variant) throw new AppError(400, "Select a product variant before adding it to the cart.");
  if (variant.stock < input.quantity) throw new AppError(409, "Only limited stock is available.");
  await db.cartItem.upsert({ where: { cartId_productId_variantId: { cartId: cart.id, productId: product.id, variantId: variant.id } }, update: { quantity: { increment: input.quantity } }, create: { cartId: cart.id, productId: product.id, variantId: variant.id, quantity: input.quantity } });
  return getCart(actor);
}
export async function changeCartItem(actor: CartActor, itemId: string, quantity: number) {
  const cart = await getOrCreateCart(actor);
  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } });
  if (!item) throw new AppError(404, "Cart item not found.");
  if (quantity <= 0) await db.cartItem.delete({ where: { id: item.id } });
  else { if (!item.variant || item.variant.stock < quantity) throw new AppError(409, "Requested quantity is not in stock."); await db.cartItem.update({ where: { id: item.id }, data: { quantity } }); }
  return getCart(actor);
}
export function couponLines(cart: Awaited<ReturnType<typeof getCart>>): CouponLine[] { return cart.items.map((item) => ({ productId: item.productId, categoryId: item.product.categoryId, collectionIds: item.product.collections.map((entry) => entry.collectionId), unitPrice: priceFor(item.variant ?? { price: null, salePrice: null }, item.product), quantity: item.quantity })); }
export async function cartTotals(cart: Awaited<ReturnType<typeof getCart>>, userId?: string) { const lines = couponLines(cart); let discount = 0; let couponError: string | undefined; if (cart.couponCode) { try { discount = (await validateCouponForCart(cart.couponCode, lines, userId)).discount; } catch (error) { couponError = error instanceof Error ? error.message : "Coupon is unavailable."; } } return { ...calculateCheckoutTotals(lines, { discount }), couponCode: cart.couponCode, couponError }; }
