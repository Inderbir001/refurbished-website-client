import { DiscountType, type Coupon } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateCouponDiscount } from "../lib/services/coupon-service";
const base: Coupon = { id: "coupon", code: "SAVE10", type: DiscountType.PERCENTAGE, value: 10, minimumOrder: null, maximumDiscount: null, startsAt: new Date("2025-01-01"), expiresAt: null, usageLimit: null, usedCount: 0, isActive: true, firstOrderOnly: false, perCustomerLimit: null, scopeType: "ORDER", scopeIds: null, createdAt: new Date(), updatedAt: new Date() };
const lines = [{ productId: "p1", categoryId: "c1", collectionIds: ["x1"], unitPrice: 10_000, quantity: 2 }];
describe("coupon calculation", () => { it("calculates a percentage discount", () => expect(calculateCouponDiscount(base, lines)).toBe(2_000)); it("caps a discount", () => expect(calculateCouponDiscount({ ...base, maximumDiscount: 1_000 }, lines)).toBe(1_000)); it("honours category scope", () => expect(calculateCouponDiscount({ ...base, scopeType: "CATEGORY", scopeIds: ["c1"] }, lines)).toBe(2_000)); });
