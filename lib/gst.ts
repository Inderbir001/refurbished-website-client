// GST helpers: GSTIN validation, financial-year invoice numbers, amounts in words, HSN codes.

// A GSTIN is 15 characters: 2-digit state code, 10-character PAN, entity number, "Z", and a check character.
const GSTIN_PATTERN = /^(0[1-9]|[1-2][0-9]|3[0-9])[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function normalizeGstin(value: string) { return value.replace(/\s+/g, "").toUpperCase(); }

export function isValidGstin(input: string) {
  const gstin = normalizeGstin(input);
  if (!GSTIN_PATTERN.test(gstin)) return false;
  // Check character (mod-36 weighted sum), so a mistyped number is caught before it ends up on an invoice.
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = CHARS.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36] === gstin[14];
}

export const isValidPan = (value: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase());

// Indian financial year runs April to March. April 2026 to March 2027 -> "2627".
export function financialYear(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 3_600_000);
  const start = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  return `${String(start).slice(-2)}${String(start + 1).slice(-2)}`;
}

// Max 16 characters, consecutive within the year: "MM/2627/000042".
export function invoiceNumber(prefix: string, fy: string, sequence: number) { return `${prefix}/${fy}/${String(sequence).padStart(6, "0")}`; }

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) { parts.push(`${ONES[Math.floor(n / 100)]} Hundred`); n %= 100; }
  if (n >= 20) { parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : "")); } else if (n > 0) parts.push(ONES[n]);
  return parts.join(" ");
}
// 123456 paise-amount -> "Rupees One Thousand Two Hundred Thirty Four and Fifty Six Paise Only" (Indian lakh/crore grouping).
export function rupeesInWords(paise: number) {
  const rupees = Math.floor(paise / 100), rest = paise % 100;
  const groups: [number, string][] = [[Math.floor(rupees / 10_000_000), "Crore"], [Math.floor(rupees / 100_000) % 100, "Lakh"], [Math.floor(rupees / 1000) % 100, "Thousand"], [rupees % 1000, ""]];
  const words = groups.filter(([n]) => n > 0).map(([n, unit]) => (unit ? `${below1000(n)} ${unit}` : below1000(n))).join(" ");
  return `Rupees ${words || "Zero"}${rest ? ` and ${below1000(rest)} Paise` : ""} Only`;
}

// HSN codes by category (4-digit). A starting point: the shop owner's tax adviser should confirm them for each product.
const HSN_BY_CATEGORY: Record<string, string> = {
  "mobile-phone": "8517", earphone: "8518", headset: "8518", "true-wireless-stereo-tws": "8518",
  charger: "8504", adapter: "8504", "power-bank": "8507", cable: "8544", mouse: "8471", "gaming-accessories": "8471",
};
export const hsnFor = (categorySlug?: string | null) => (categorySlug ? HSN_BY_CATEGORY[categorySlug] ?? "" : "");
