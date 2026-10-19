import { describe, expect, it } from "vitest";
import { highlights, parseDescription, plainDescription } from "../lib/description";

describe("product description layout", () => {
  it("splits labels that were pasted with no line break", () => {
    const blocks = parseDescription("• Display: 6.59\" IPS LCD, 120Hz refresh rateProcessor: Snapdragon 695 5G (Adreno 619 GPU)RAM & Storage: 6GB | 128GB");
    expect(blocks).toHaveLength(1);
    const list = blocks[0];
    expect(list.kind).toBe("list");
    if (list.kind === "list") expect(list.items.map((item) => item.label)).toEqual(["Display", "Processor", "RAM & Storage"]);
  });

  it("does not cut numbers that carry a unit", () => {
    const blocks = parseDescription("Massive 5000mAh Battery: Stay powered all day.\nSmooth 90Hz HD+ Display: Fluid scrolling on the 6.6-inch screen.");
    expect(blocks).toHaveLength(1);
    const list = blocks[0];
    if (list.kind === "list") expect(list.items.map((item) => item.label)).toEqual(["Massive 5000mAh Battery", "Smooth 90Hz HD+ Display"]);
  });

  it("does not cut a unit that has a space before it", () => {
    const blocks = parseDescription("• 10001 mAh Battery Capacity: Massive battery power.\n• 6.8 Inch Full HD+ AMOLED Display: Large immersive screen.");
    const list = blocks[0];
    expect(blocks).toHaveLength(1);
    if (list.kind === "list") expect(list.items.map((item) => item.label)).toEqual(["10001 mAh Battery Capacity", "6.8 Inch Full HD+ AMOLED Display"]);
  });

  it("keeps mixed-case words like GaN whole", () => {
    const blocks = parseDescription("• Fast Charging: 100W output.\n• GaN Technology: Smaller and cooler.");
    const list = blocks[0];
    expect(blocks).toHaveLength(1);
    if (list.kind === "list") expect(list.items.map((item) => item.label)).toEqual(["Fast Charging", "GaN Technology"]);
  });

  it("shows spec-style highlights with their value", () => {
    const blocks = parseDescription("Display: 6.59 inch IPS\nBattery: 5000 mAh\nHigh-Speed Charging: 33W");
    expect(highlights(blocks)).toEqual(["Display: 6.59 inch IPS", "Battery: 5000 mAh", "High-Speed Charging: 33W"]);
  });

  it("treats a short line above a list as a sub-heading", () => {
    const blocks = parseDescription("General\nModel Name: A100\nColor: Black");
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "list"]);
  });

  it("reads \"Title — text\" lines as titled rows", () => {
    const blocks = parseDescription("Stunning Shots — The 50MP camera is sharp.\nCustom Action Key — One button, many shortcuts.");
    const list = blocks[0];
    expect(blocks).toHaveLength(1);
    if (list.kind === "list") expect(list.items.map((item) => item.label)).toEqual(["Stunning Shots", "Custom Action Key"]);
  });

  it("never cuts long sentences into highlights", () => {
    const sentences = "• The perfect way to add some style and stand out from the crowd with these earphones\n• The stylish earphones are a definite fashion statement for everyone who wants one";
    expect(highlights(parseDescription(sentences))).toEqual([]);
    expect(highlights(parseDescription("• Deep bass\n• Magnetic earbuds\n• 60 hours playback"))).toEqual(["Deep bass", "Magnetic earbuds", "60 hours playback"]);
  });

  it("keeps bullets, headings and paragraphs apart", () => {
    const blocks = parseDescription("Great charger for everyday use.\n\nKey Features:\n\n• High-Speed Charging: 100W output.\n\n• Three ports for versatility");
    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "heading", "list"]);
    const list = blocks[2];
    if (list.kind === "list") { expect(list.items).toHaveLength(2); expect(list.items[0]).toEqual({ label: "High-Speed Charging", text: "100W output." }); }
  });

  it("breaks one huge paragraph into readable pieces", () => {
    const sentence = "This adapter charges quickly and safely for many devices. ";
    const blocks = parseDescription(sentence.repeat(12).trim());
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((block) => block.kind === "paragraph")).toBe(true);
  });

  it("does not turn ordinary sentences with a colon in the middle into labels", () => {
    const blocks = parseDescription("This phone is great. Note: it ships without a charger in the box.");
    expect(blocks).toEqual([{ kind: "paragraph", text: "This phone is great. Note: it ships without a charger in the box." }]);
  });

  it("makes a clean one-line summary and short highlights", () => {
    const text = "• Fast Charging: 33W.\n• Long Battery: 5000mAh.\n• Slim Design: 7mm.";
    expect(plainDescription(text)).toBe("Fast Charging: 33W. Long Battery: 5000mAh. Slim Design: 7mm.");
    expect(highlights(parseDescription(text))).toEqual(["Fast Charging: 33W", "Long Battery: 5000mAh", "Slim Design: 7mm"]);
    expect(parseDescription("")).toEqual([]);
  });
});
