import { describe, expect, it } from "vitest";
import { couponLines, getCart } from "../lib/services/cart-service";

describe("cart service", () => {
  it("maps persisted variants to server-priced coupon lines", () => {
    const cart = { items: [{ productId: "product-1", product: { categoryId: "phones", basePrice: 80_000, salePrice: 70_000, collections: [{ collectionId: "deals" }] }, variant: { price: 75_000, salePrice: 65_000 }, quantity: 2 }] } as unknown as Awaited<ReturnType<typeof getCart>>;
    expect(couponLines(cart)).toEqual([{ productId: "product-1", categoryId: "phones", collectionIds: ["deals"], unitPrice: 65_000, quantity: 2 }]);
  });
});
