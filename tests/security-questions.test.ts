import { describe, expect, it } from "vitest";
import { hashSecurityAnswer, SECURITY_QUESTIONS, verifySecurityAnswer } from "../lib/security-questions";

describe("security question answers", () => {
  it("verifies the right answer and rejects a wrong one", async () => {
    const hash = await hashSecurityAnswer("Springfield");
    expect(await verifySecurityAnswer("Springfield", hash)).toBe(true);
    expect(await verifySecurityAnswer("Shelbyville", hash)).toBe(false);
  });
  // Three bcrypt hash/compare round trips under a heavily loaded test run can occasionally outrun the default timeout.
  it("ignores case and extra spacing, but not the wording itself", async () => {
    const hash = await hashSecurityAnswer("  New   Delhi ");
    expect(await verifySecurityAnswer("new delhi", hash)).toBe(true);
    expect(await verifySecurityAnswer("New  Delhi", hash)).toBe(true);
    expect(await verifySecurityAnswer("New Delhi123", hash)).toBe(false);
  }, 15_000);
  it("ships at least a few preset questions, birth year included", () => {
    expect(SECURITY_QUESTIONS.length).toBeGreaterThanOrEqual(3);
    expect(SECURITY_QUESTIONS.some((q) => /born/i.test(q))).toBe(true);
  });
});
