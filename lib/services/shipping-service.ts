import { db } from "../db";

export type ShippingQuote = { ruleId?: string; name: string; charge: number; estimatedDaysMin: number; estimatedDaysMax: number };

export async function quoteShipping(input: { state: string; pincode: string; subtotal: number }): Promise<ShippingQuote> {
  const store = await db.store.findFirst({ include: { settings: true, shippingRules: { where: { isActive: true }, orderBy: { priority: "asc" } } } });
  const fallbackThreshold = store?.settings?.freeShippingThreshold ?? 49_900;
  for (const rule of store?.shippingRules ?? []) {
    const stateMatch = !rule.states.length || rule.states.some((state) => state.toLowerCase() === input.state.toLowerCase());
    const pincodeMatch = !rule.pincodes.length || rule.pincodes.includes(input.pincode);
    const minMatch = rule.minimumOrder == null || input.subtotal >= rule.minimumOrder;
    const maxMatch = rule.maximumOrder == null || input.subtotal <= rule.maximumOrder;
    if (!stateMatch || !pincodeMatch || !minMatch || !maxMatch) continue;
    const charge = rule.freeShippingThreshold != null && input.subtotal >= rule.freeShippingThreshold ? 0 : rule.charge;
    return { ruleId: rule.id, name: rule.name, charge, estimatedDaysMin: rule.estimatedDaysMin, estimatedDaysMax: rule.estimatedDaysMax };
  }
  return { name: "Standard delivery", charge: input.subtotal >= fallbackThreshold ? 0 : 9_900, estimatedDaysMin: 3, estimatedDaysMax: 7 };
}
