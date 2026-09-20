import { describe, expect, it } from "vitest";
import { calculateCheckoutTotals } from "../lib/services/pricing-service";

describe("calculateCheckoutTotals", () => {
  it("calculates subtotal, GST and delivery entirely from trusted line prices", () => {
    expect(calculateCheckoutTotals([{ unitPrice: 10_000, quantity: 2 }])).toEqual({ subtotal: 20_000, discount: 0, tax: 3_600, shipping: 9_900, total: 33_500 });
  });

  it("applies free delivery at the threshold", () => {
    expect(calculateCheckoutTotals([{ unitPrice: 49_900, quantity: 1 }]).shipping).toBe(0);
  });

  it("never discounts below zero", () => {
    expect(calculateCheckoutTotals([{ unitPrice: 1_000, quantity: 1 }], { discount: 5_000 })).toEqual({ subtotal: 1_000, discount: 1_000, tax: 0, shipping: 0, total: 0 });
  });
});
