import { describe, expect, it } from "vitest";
import { thumbKey, thumbUrl } from "../lib/image-url";

const BASE = "https://abc.supabase.co/storage/v1/object/public/product-images";

describe("small photo copies", () => {
  it("points a stored photo at its small WebP copy", () => {
    expect(thumbUrl(`${BASE}/store1/1792-abc-phone.jpg`, 480)).toBe(`${BASE}/_t/480/store1/1792-abc-phone.webp`);
    expect(thumbUrl(`${BASE}/store1/1792-abc-phone.jpg?v=2`, 900)).toBe(`${BASE}/_t/900/store1/1792-abc-phone.webp`);
  });
  it("leaves everything else alone", () => {
    expect(thumbUrl("https://images.unsplash.com/photo-1.jpg")).toBe("https://images.unsplash.com/photo-1.jpg");
    expect(thumbUrl(`${BASE}/brand-logos/boat.png`)).toBe(`${BASE}/brand-logos/boat.png`);
    expect(thumbUrl(`${BASE}/_t/480/store1/x.webp`)).toBe(`${BASE}/_t/480/store1/x.webp`);
    expect(thumbUrl("")).toBe("");
    expect(thumbUrl(null)).toBe("");
  });
  it("uses the same key when making and when asking", () => {
    expect(thumbKey("store1/file.name.png", 480)).toBe("_t/480/store1/file.name.webp");
  });
});
