import { describe, expect, it } from "vitest";
import { likeEscape } from "../lib/like";

describe("likeEscape", () => {
  it("turns LIKE wildcards typed by a visitor into ordinary characters", () => {
    expect(likeEscape("%")).toBe("\\%");
    expect(likeEscape("50%_off")).toBe("50\\%\\_off");
    expect(likeEscape("a\\b")).toBe("a\\\\b");
  });
  it("leaves normal search text alone", () => {
    expect(likeEscape("iphone 13 pro")).toBe("iphone 13 pro");
  });
});
