import type { CSSProperties } from "react";
import type { GeneratorId } from "../engine";

// Presentation-only colours for the fallback tiles (no art yet).
const GEN_HUE: Record<GeneratorId, number> = {
  Gen0: 30, Gen1: 8, Gen2: 212, Gen3: 135, Gen4: 275, Gen5: 42, Gen6: 178,
};
const CHAIN_SHIFT: Record<string, { s: number; l: number }> = {
  ChainA: { s: 55, l: 42 },
  ChainB: { s: 70, l: 30 },
  ChainC: { s: 85, l: 55 },
};

export function tileStyle(gen: GeneratorId, chain = "ChainA", level = 1): CSSProperties {
  const hue = GEN_HUE[gen];
  const { s, l } = CHAIN_SHIFT[chain] ?? CHAIN_SHIFT.ChainA;
  const lift = Math.min(level, 10) * 1.6;
  return {
    background: `linear-gradient(160deg, hsl(${hue} ${s}% ${l + lift + 8}%), hsl(${hue} ${s}% ${l}%))`,
    borderColor: `hsl(${hue} ${s}% ${l + 25}%)`,
  };
}

