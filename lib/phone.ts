import { z } from "zod";

// Accepts how people actually type Indian mobile numbers: "07019549904", "+91 70195 49904", "91-7019549904".
export function normalizeIndianPhone(value: unknown) {
  if (typeof value !== "string") return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}
export const indianPhone = z.preprocess(normalizeIndianPhone, z.string().regex(/^[6-9]\d{9}$/, "enter a valid 10-digit mobile number"));
