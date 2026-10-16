import { describe, expect, it } from "vitest";
import { financialYear, invoiceNumber, isValidGstin, normalizeGstin, rupeesInWords } from "../lib/gst";

describe("GSTIN validation", () => {
  it("accepts real, correctly checksummed numbers (spaces and lowercase are tolerated)", () => {
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
    expect(isValidGstin("29 aagcb7383j1z4")).toBe(true);
    expect(normalizeGstin(" 29aagcb7383j1z4 ")).toBe("29AAGCB7383J1Z4");
  });
  it("rejects a mistyped number, wrong length or a bad state code", () => {
    expect(isValidGstin("27AAPFU0939F1ZX")).toBe(false); // wrong check character
    expect(isValidGstin("27AAPFU0939F1Z")).toBe(false);
    expect(isValidGstin("99AAPFU0939F1ZV")).toBe(false);
    expect(isValidGstin("")).toBe(false);
  });
});

describe("invoice numbers", () => {
  it("uses the Indian financial year (April to March)", () => {
    expect(financialYear(new Date("2026-10-16T08:00:00Z"))).toBe("2627");
    expect(financialYear(new Date("2027-03-31T10:00:00Z"))).toBe("2627");
    expect(financialYear(new Date("2027-03-31T20:00:00Z"))).toBe("2728"); // already 1 April in India
    expect(financialYear(new Date("2026-04-01T00:00:00+05:30"))).toBe("2627");
  });
  it("is consecutive, zero padded and within the 16 character GST limit", () => {
    expect(invoiceNumber("MM", "2627", 1)).toBe("MM/2627/000001");
    expect(invoiceNumber("MM", "2627", 123456)).toBe("MM/2627/123456");
    expect(invoiceNumber("MM", "2627", 1).length).toBeLessThanOrEqual(16);
  });
});

describe("amount in words", () => {
  it("uses Indian grouping and paise", () => {
    expect(rupeesInWords(74900)).toBe("Rupees Seven Hundred Forty Nine Only");
    expect(rupeesInWords(123456)).toBe("Rupees One Thousand Two Hundred Thirty Four and Fifty Six Paise Only");
    expect(rupeesInWords(1_250_000_00)).toBe("Rupees Twelve Lakh Fifty Thousand Only");
    expect(rupeesInWords(10_000_000_00)).toBe("Rupees One Crore Only");
    expect(rupeesInWords(0)).toBe("Rupees Zero Only");
  });
});

import { isValidPan } from "../lib/gst";
describe("PAN", () => {
  it("accepts the standard format only", () => {
    expect(isValidPan("ABCDE1234F")).toBe(true);
    expect(isValidPan("abcde1234f")).toBe(true);
    expect(isValidPan("ABCD1234EF")).toBe(false);
    expect(isValidPan("")).toBe(false);
  });
});
