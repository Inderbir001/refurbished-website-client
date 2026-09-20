export const inr = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
export const priceFor = (value: { price: number | null; salePrice: number | null }, product: { basePrice: number; salePrice: number | null }) => value.salePrice ?? value.price ?? product.salePrice ?? product.basePrice;
export function dealOf(product: { basePrice: number; salePrice: number | null; variants: { price: number | null; salePrice: number | null }[] }) {
  const variant = product.variants[0];
  const price = priceFor(variant ?? { price: null, salePrice: null }, product);
  const original = variant?.price ?? product.basePrice;
  return { price, original, saving: Math.max(original - price, 0), percent: original > price ? Math.round((original - price) / original * 100) : 0 };
}
