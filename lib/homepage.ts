// Headings seeded before the offers redesign. They are treated as "not set" so the homepage shows its own
// offer-focused headings; an admin's own text (typed in Admin → Storefront) always wins.
export const legacyTitles = new Set(["CERTIFIED TECH, CLEARLY PRICED", "Shop every essential", "Worth a closer look", "Curated deals", "Brands people ask for", "No guesswork. Just good gear.", "FEATURED PRODUCTS", "COLLECTION", "TRUST", "HERO", "CATEGORIES", "BRANDS", "PROMO_BANNER"]);
export const custom = (title: string | null | undefined, fallback: string) => (title && !legacyTitles.has(title) ? title : fallback);
