export type PricedLine = { unitPrice: number; quantity: number; taxRate?: number };

export function calculateCheckoutTotals(lines: PricedLine[], options: { taxRate?: number; freeShippingThreshold?: number; standardShipping?: number; shippingAmount?: number; discount?: number } = {}) {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const discount = Math.min(Math.max(options.discount ?? 0, 0), subtotal);
  const taxableAmount = subtotal - discount;
  const discountRatio = subtotal ? discount / subtotal : 0;
  const tax = lines.reduce((sum, line) => {
    const discountedLine = line.unitPrice * line.quantity * (1 - discountRatio);
    const rate = line.taxRate ?? options.taxRate ?? 18;
    return sum + Math.round(discountedLine * rate / (100 + rate)); // GST contained in the (discounted) price
  }, 0);
  const freeShippingThreshold = options.freeShippingThreshold ?? 49_900;
  const shipping = options.shippingAmount ?? (taxableAmount === 0 || taxableAmount >= freeShippingThreshold ? 0 : options.standardShipping ?? 9_900);
  // Prices are GST-inclusive: `tax` is the part of the price that is GST, so it is NOT added to the total again.
  return { subtotal, discount, tax, shipping, total: taxableAmount + shipping };
}
