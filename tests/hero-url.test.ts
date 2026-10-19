import { describe, expect, it } from "vitest";
import { heroKey, heroUrl } from "../lib/image-url";

const BASE = "https://abc.supabase.co/storage/v1/object/public/product-images";
describe("banner copies", () => {
  it("points a banner at its high-quality copy", () => {
    expect(heroUrl(`${BASE}/store1/1792-abc-banner-desktop.png`)).toBe(`${BASE}/_t/hero/store1/1792-abc-banner-desktop.webp`);
    expect(heroKey("store1/a.b.jpg?v=1")).toBe("_t/hero/store1/a.b.webp");
  });
  it("leaves other websites' pictures and copies alone", () => {
    expect(heroUrl("https://images.unsplash.com/x.jpg")).toBe("https://images.unsplash.com/x.jpg");
    expect(heroUrl(`${BASE}/_t/hero/store1/x.webp`)).toBe(`${BASE}/_t/hero/store1/x.webp`);
    expect(heroUrl(null)).toBe("");
  });
});
