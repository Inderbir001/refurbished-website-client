// Pure pricing helpers shared by the admin UI (live preview) and the offers API, so both always agree.

// Deal price for `percent` off a regular price, rounded to whole rupees (prices are stored in paise).
// Returns null when the result would not be a valid sale price (too cheap, or not lower than the regular price).
export function salePriceFor(regular: number, percent: number) {
  const price = Math.round((regular * (100 - percent)) / 100 / 100) * 100;
  return price >= 100 && price < regular ? price : null;
}

export type OfferRow = {
  id: string;
  name: string;
  sku: string;
  image: string | null;
  categoryId: string | null;
  category: string;
  brandId: string | null;
  brand: string;
  condition: string;
  status: string;
  original: number;
  price: number;
  percent: number;
};
