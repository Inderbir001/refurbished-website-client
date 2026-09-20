export const inr = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
export const priceFor = (value: { price: number | null; salePrice: number | null }, product: { basePrice: number; salePrice: number | null }) => value.salePrice ?? value.price ?? product.salePrice ?? product.basePrice;
