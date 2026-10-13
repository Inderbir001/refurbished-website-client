// Address search through Google Places (API "New"). The key stays on the backend; the browser only talks to our own
// /api/places/* routes, which are for signed-in shoppers and rate limited, so nobody can run up the bill from outside.
import { AppError } from "@/lib/http";

export const placesEnabled = () => Boolean(process.env.GOOGLE_PLACES_API_KEY);
const key = () => process.env.GOOGLE_PLACES_API_KEY ?? "";
const base = process.env.GOOGLE_PLACES_BASE_URL ?? "https://places.googleapis.com"; // overridden only by tests

export type Suggestion = { placeId: string; main: string; secondary: string };
export type PlaceAddress = { line1: string; line2: string; city: string; state: string; pincode: string };

async function google(response: Response) {
  if (response.ok) return response.json();
  const detail = (await response.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
  // The shopper only needs to know search is unavailable; the exact Google reason goes to the server log.
  console.error("Google Places error", response.status, detail.error?.status, detail.error?.message);
  throw new AppError(502, "Address search is unavailable right now. Please type your address.");
}

export async function suggest(input: string, sessionToken: string): Promise<Suggestion[]> {
  const data = await google(await fetch(`${base}/v1/places:autocomplete`, {
    method: "POST", signal: AbortSignal.timeout(6_000),
    headers: { "content-type": "application/json", "x-goog-api-key": key() },
    body: JSON.stringify({ input, sessionToken, includedRegionCodes: ["in"], languageCode: "en" }),
  })) as { suggestions?: { placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[] };
  return (data.suggestions ?? []).flatMap((item) => {
    const p = item.placePrediction;
    if (!p?.placeId) return [];
    return [{ placeId: p.placeId, main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "", secondary: p.structuredFormat?.secondaryText?.text ?? "" }];
  }).slice(0, 6);
}

type Component = { longText?: string; shortText?: string; types?: string[] };
export async function placeAddress(placeId: string, sessionToken: string): Promise<PlaceAddress> {
  const data = await google(await fetch(`${base}/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=en`, {
    signal: AbortSignal.timeout(6_000),
    headers: { "x-goog-api-key": key(), "x-goog-fieldmask": "addressComponents,formattedAddress,displayName" },
  })) as { addressComponents?: Component[]; formattedAddress?: string; displayName?: { text?: string } };
  const parts = data.addressComponents ?? [];
  const find = (...types: string[]) => { for (const type of types) { const hit = parts.find((part) => part.types?.includes(type)); if (hit?.longText) return hit.longText; } return ""; };
  const city = find("locality", "postal_town", "administrative_area_level_3", "administrative_area_level_2");
  const state = find("administrative_area_level_1");
  const pincode = find("postal_code").replace(/\s+/g, "");
  // Street part of the address: the place's own name (building, shop, landmark) then the street-level pieces, without city/state/pin/country.
  const street = [find("premise"), [find("street_number"), find("route")].filter(Boolean).join(" "), find("sublocality_level_2"), find("sublocality_level_1", "sublocality", "neighborhood")].filter(Boolean);
  const name = data.displayName?.text ?? "";
  const line1 = [name && !street.some((piece) => piece.includes(name)) ? name : "", ...street].filter(Boolean).join(", ") || (data.formattedAddress ?? "").split(",").slice(0, 2).join(",").trim();
  return { line1, line2: "", city, state, pincode };
}
