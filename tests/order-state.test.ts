import { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "../lib/services/order-state";

describe("order state machine", () => {
  it("allows the normal fulfilment sequence", () => {
    expect(canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.PROCESSING)).toBe(true);
    expect(canTransitionOrder(OrderStatus.PACKED, OrderStatus.SHIPPED)).toBe(true);
  });

  it("rejects skipping fulfilment states", () => {
    expect(canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.DELIVERED)).toBe(false);
    expect(canTransitionOrder(OrderStatus.CANCELLED, OrderStatus.PROCESSING)).toBe(false);
  });
});
