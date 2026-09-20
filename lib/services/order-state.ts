import { OrderStatus } from "@prisma/client";

export const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  PACKED: [OrderStatus.SHIPPED],
  SHIPPED: [OrderStatus.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.RETURN_REQUESTED],
  RETURN_REQUESTED: [OrderStatus.RETURNED],
  RETURNED: [OrderStatus.REFUNDED],
};

export function canTransitionOrder(current: OrderStatus, next: OrderStatus) {
  return validTransitions[current]?.includes(next) ?? false;
}
