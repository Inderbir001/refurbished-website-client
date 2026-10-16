// Plain-English names and colours for the codes stored in the database, so admin screens never show SCREAMING_CASE.
export type Tone = "ok" | "warn" | "bad" | "muted" | "";
const entry = (label: string, tone: Tone): [string, Tone] => [label, tone];

export const ORDER_STATUS: Record<string, [string, Tone]> = {
  PENDING: entry("Awaiting payment", "warn"), CONFIRMED: entry("Confirmed", "ok"), PROCESSING: entry("Preparing", "ok"), PACKED: entry("Packed", "ok"),
  SHIPPED: entry("Shipped", "ok"), OUT_FOR_DELIVERY: entry("Out for delivery", "ok"), DELIVERED: entry("Delivered", "ok"), CANCELLED: entry("Cancelled", "muted"),
  RETURN_REQUESTED: entry("Return requested", "warn"), RETURNED: entry("Returned", "muted"), REFUNDED: entry("Refunded", "muted"),
};
export const PAYMENT_STATUS: Record<string, [string, Tone]> = {
  PENDING: entry("Not paid yet", "warn"), PROCESSING: entry("Waiting for payment", "warn"), SUCCESS: entry("Paid", "ok"), FAILED: entry("Failed", "bad"),
  CANCELLED: entry("Cancelled", "muted"), REFUNDED: entry("Refunded", "muted"), PARTIALLY_REFUNDED: entry("Part refunded", "warn"),
};
export const ROLE: Record<string, string> = { SUPER_ADMIN: "Owner", ADMIN: "Admin", PRODUCT_MANAGER: "Product manager", ORDER_MANAGER: "Order manager", CUSTOMER: "Customer" };
export const GATEWAY: Record<string, string> = { RAZORPAY: "Razorpay", PHONEPE: "PhonePe", SNAPMIT: "Snapmint" };

export const label = (map: Record<string, [string, Tone]>, key: string): [string, Tone] => map[key] ?? [key.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()), ""];
