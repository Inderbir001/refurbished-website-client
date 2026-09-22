import { db } from "../db";

export type ShippingQuote = { ruleId?: string; name: string; charge: number; estimatedDaysMin: number; estimatedDaysMax: number };

// Every configured delivery option that applies to this address and cart value, best (highest priority) first.
// Falls back to a single flat "Standard delivery" option when no rule is configured or none matches.
export async function quoteShippingOptions(input: { state: string; pincode: string; subtotal: number }): Promise<ShippingQuote[]> {
  const store = await db.store.findFirst({ include: { settings: true, shippingRules: { where: { isActive: true }, orderBy: { priority: "asc" } } } });
  const fallbackThreshold = store?.settings?.freeShippingThreshold ?? 49_900;
  const options: ShippingQuote[] = [];
  for (const rule of store?.shippingRules ?? []) {
    const stateMatch = !rule.states.length || rule.states.some((state) => state.toLowerCase() === input.state.toLowerCase());
    const pincodeMatch = !rule.pincodes.length || rule.pincodes.includes(input.pincode);
    const minMatch = rule.minimumOrder == null || input.subtotal >= rule.minimumOrder;
    const maxMatch = rule.maximumOrder == null || input.subtotal <= rule.maximumOrder;
    if (!stateMatch || !pincodeMatch || !minMatch || !maxMatch) continue;
    const charge = rule.freeShippingThreshold != null && input.subtotal >= rule.freeShippingThreshold ? 0 : rule.charge;
    options.push({ ruleId: rule.id, name: rule.name, charge, estimatedDaysMin: rule.estimatedDaysMin, estimatedDaysMax: rule.estimatedDaysMax });
  }
  if (!options.length) options.push({ name: "Standard delivery", charge: input.subtotal >= fallbackThreshold ? 0 : 9_900, estimatedDaysMin: 3, estimatedDaysMax: 7 });
  return options;
}

// The option used when the customer hasn't chosen one, or their choice no longer applies (address changed,
// cart value moved outside its range, the rule was turned off…) — always the best match, same as before.
export async function quoteShipping(input: { state: string; pincode: string; subtotal: number }, chosenRuleId?: string): Promise<ShippingQuote> {
  const options = await quoteShippingOptions(input);
  if (chosenRuleId) { const chosen = options.find((option) => option.ruleId === chosenRuleId); if (chosen) return chosen; }
  return options[0];
}
