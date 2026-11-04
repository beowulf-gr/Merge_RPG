import { describe, it, expect } from "vitest";
import { mulberry32, weightedChoice, pickOne } from "../../src/engine/rng";

describe("mulberry32", () => {
  it("is deterministic for the same seed", () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it("returns values in [0, 1)", () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("produces a roughly uniform distribution", () => {
    const rng = mulberry32(99);
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const n = 10000;
    for (let i = 0; i < n; i++) {
      buckets[Math.floor(rng() * 10)]++;
    }
    for (const count of buckets) {
      expect(count / n).toBeCloseTo(0.1, 1);
    }
  });
});

describe("weightedChoice", () => {
  it("respects weights", () => {
    const rng = mulberry32(7);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 10000; i++) {
      const r = weightedChoice(["a", "b", "c"], [0.1, 0.8, 0.1], rng);
      counts[r as keyof typeof counts]++;
    }
    expect(counts.b / 10000).toBeCloseTo(0.8, 1);
    expect(counts.a / 10000).toBeCloseTo(0.1, 1);
  });

  it("throws on empty items", () => {
    const rng = mulberry32(1);
    expect(() => weightedChoice([], [], rng)).toThrow();
  });
});

describe("pickOne", () => {
  it("returns an element from the array", () => {
    const rng = mulberry32(5);
    const items = [1, 2, 3, 4, 5];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pickOne(items, rng));
    }
  });

  it("throws on empty array", () => {
    const rng = mulberry32(1);
    expect(() => pickOne([], rng)).toThrow();
  });
});
