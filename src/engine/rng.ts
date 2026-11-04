export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function weightedChoice<T>(items: T[], weights: number[], rng: RNG): T {
  if (items.length === 0) throw new Error("weightedChoice: empty items");
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function pickOne<T>(items: T[], rng: RNG): T {
  if (items.length === 0) throw new Error("pickOne: empty items");
  return items[Math.floor(rng() * items.length)];
}
