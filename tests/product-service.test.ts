import { describe, expect, it } from "vitest";
import { AppError } from "../lib/http";
import { assertValidProductPricing, normalizeProductSlug } from "../lib/services/product-service";
describe("product service", () => { it("normalizes storefront slugs", () => expect(normalizeProductSlug(" Apple iPhone 15 / 128 GB ")).toBe("apple-iphone-15-128-gb")); it("rejects a sale price at or above regular price", () => expect(() => assertValidProductPricing({ basePrice: 10_000, salePrice: 10_000 })).toThrow(AppError)); it("accepts valid paise pricing", () => expect(() => assertValidProductPricing({ basePrice: 10_000, salePrice: 8_000, costPrice: 5_000 })).not.toThrow()); });
