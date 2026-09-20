import { describe, expect, it } from "vitest";
import { stockAfterAdjustment } from "../lib/services/inventory-service";
describe("inventory service", () => { it("applies positive and negative whole adjustments", () => { expect(stockAfterAdjustment(10, 4)).toBe(14); expect(stockAfterAdjustment(10, -4)).toBe(6); }); it("prevents negative inventory", () => expect(() => stockAfterAdjustment(2, -3)).toThrow("Inventory cannot become negative")); it("rejects a zero adjustment", () => expect(() => stockAfterAdjustment(2, 0)).toThrow()); });
