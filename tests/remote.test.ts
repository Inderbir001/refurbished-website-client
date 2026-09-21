import { describe, expect, it } from "vitest";
import { createRemoteDb } from "../lib/remote-db";
import { decode, encode } from "../lib/remote";

describe("remote data codec", () => {
  it("round-trips dates, nested data and BigInt", () => {
    const original = { where: { startsAt: { lte: new Date("2026-09-21T10:00:00.000Z") }, list: [1, "a", null] }, big: BigInt(42), plain: "x" };
    const copy = decode<typeof original>(encode(original));
    expect(copy.where.startsAt.lte).toBeInstanceOf(Date);
    expect(copy.where.startsAt.lte.toISOString()).toBe("2026-09-21T10:00:00.000Z");
    expect(copy.where.list).toEqual([1, "a", null]);
    expect(copy.big).toBe(BigInt(42));
    expect(copy.plain).toBe("x");
  });
  it("leaves ordinary objects that merely look similar alone", () => {
    expect(decode<{ $date: string; other: number }>(encode({ $date: "not-a-date", other: 1 }))).toEqual({ $date: "not-a-date", other: 1 });
  });
});

describe("remote db proxy", () => {
  it("is never mistaken for a Promise and refuses transactions on the frontend", () => {
    const remote = createRemoteDb() as unknown as Record<string, unknown>;
    expect(remote.then).toBeUndefined();
    expect(() => (remote.$transaction as () => void)()).toThrow(/backend only/);
  });
});
