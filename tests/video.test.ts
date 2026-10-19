import { describe, expect, it } from "vitest";
import { isAllowedVideo, parseVideo } from "../lib/video";

const STORAGE = "https://abc.supabase.co";

describe("product videos", () => {
  it("understands the usual YouTube links", () => {
    for (const url of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ"]) {
      expect(parseVideo(url)).toMatchObject({ kind: "youtube", id: "dQw4w9WgXcQ" });
    }
  });
  it("understands Vimeo links", () => expect(parseVideo("https://vimeo.com/123456789")).toMatchObject({ kind: "vimeo", id: "123456789" }));
  it("rejects anything else", () => {
    for (const url of ["https://example.com/page", "javascript:alert(1)", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "http://example.com/a.mp4", ""]) expect(parseVideo(url)).toBeNull();
  });
  it("only accepts uploaded files from our own video storage", () => {
    expect(isAllowedVideo(`${STORAGE}/storage/v1/object/public/product-videos/videos/a.mp4`, STORAGE)).toBe(true);
    expect(isAllowedVideo("https://evil.example/a.mp4", STORAGE)).toBe(false);
    expect(isAllowedVideo(`${STORAGE}/storage/v1/object/public/product-images/a.mp4`, STORAGE)).toBe(false);
    expect(isAllowedVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ", STORAGE)).toBe(true);
  });
});
