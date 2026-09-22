import { describe, expect, it } from "vitest";
import { hashSecurityAnswer, SECURITY_QUESTIONS, verifySecurityAnswer } from "../lib/security-questions";

describe("security question answers", () => {
  it("verifies the right answer and rejects a wrong one", async () => {
    const hash = await hashSecurityAnswer("Springfield");
    expect(await verifySecurityAnswer("Springfield", hash)).toBe(true);
    expect(await verifySecurityAnswer("Shelbyville", hash)).toBe(false);
  });
  it("ignores case and extra spacing, but not the wording itself", async () => {
    const hash = await hashSecurityAnswer("  New   Delhi ");
    expect(await verifySecurityAnswer("new delhi", hash)).toBe(true);
    expect(await verifySecurityAnswer("New  Delhi", hash)).toBe(true);
    expect(await verifySecurityAnswer("New Delhi123", hash)).toBe(false);
  });
  it("ships at least a few preset questions, birth year included", () => {
    expect(SECURITY_QUESTIONS.length).toBeGreaterThanOrEqual(3);
    expect(SECURITY_QUESTIONS.some((q) => /born/i.test(q))).toBe(true);
  });
});
