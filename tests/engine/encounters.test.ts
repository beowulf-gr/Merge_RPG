import { describe, it, expect } from "vitest";
import { mulberry32 } from "../../src/engine/rng";
import { loadBalance } from "../../src/engine/config";
import {
  getMinimumItemsRequired,
  generateEncounter,
  getUnlockedGeneratorsAndChains,
  computeCurrentDropRates,
  CR_XP_MAP,
} from "../../src/engine/encounters";
import { UpgradeState } from "../../src/engine/types";

const cfg = loadBalance();

function defaultUpgrades(): UpgradeState {
  return {
    generatorLevels: { Gen0: 1, Gen1: 1, Gen2: 1, Gen3: 1, Gen4: 1, Gen5: 1, Gen6: 1 },
    secondaryDropBoost: 0,
    tertiaryDropBoost: 0,
    luckyDropChance: 0,
    goldMultiplier: 0,
    encounterSlots: 3,
    skillCooldownReduction: 0,
    generatorCooldownReduction: 0,
    inventorySlots: 0,
    mergeCritChance: 0,
    capacityBoost: 0,
  };
}

describe("getMinimumItemsRequired (parity with Python)", () => {
  // These values were computed by running the Python function manually:
  // get_minimum_items_required(target, maxLevel)
  // CR_XP_MAP values used: {1:25,2:50,3:100,4:200,5:450,6:700,7:1100,8:1800,9:2300,10:2900}
  const cases: [number, number, number][] = [
    [25, 1, 1],       // exactly one L1
    [50, 1, 2],       // need two L1s to get to 50
    [50, 2, 1],       // one L2 = 50
    [100, 2, 2],      // 50+50=100 → 2 items
    [100, 3, 1],      // one L3 = 100
    [200, 2, 4],      // 4×50=200
    [200, 4, 1],      // one L4=200
    [450, 1, 18],     // 18×25=450
    [80, 2, 3],       // 80: 1×50=50, rem=30; 1×25=25, rem=5>0 → 3 items
    [1, 1, 1],        // min is 1
  ];

  for (const [targetXp, maxLevel, expected] of cases) {
    it(`getMinimumItemsRequired(${targetXp}, ${maxLevel}) === ${expected}`, () => {
      expect(getMinimumItemsRequired(targetXp, maxLevel)).toBe(expected);
    });
  }
});

describe("generateEncounter", () => {
  it("produces a valid encounter object", () => {
    const rng = mulberry32(42);
    const upgrades = defaultUpgrades();
    const unlockedPairs = getUnlockedGeneratorsAndChains(1, cfg);
    const dropRates = computeCurrentDropRates(upgrades, cfg);
    const enc = generateEncounter(
      { mode: "uniform", playerLevel: 1, unlockedPairs, dropRates, upgradeState: upgrades },
      rng,
      cfg
    );
    expect(enc.id).toBeDefined();
    expect(enc.requiredItems.length).toBeGreaterThan(0);
    expect(enc.rewards.gold).toBeGreaterThanOrEqual(10);
    expect(enc.rewards.xp).toBeGreaterThanOrEqual(2);
    expect(["Easy", "Medium", "Hard", "Deadly"]).toContain(enc.difficulty);
  });

  it("difficulty distribution is roughly 20/40/30/10 over 1000 encounters", () => {
    const rng = mulberry32(7);
    const upgrades = defaultUpgrades();
    const unlockedPairs = getUnlockedGeneratorsAndChains(5, cfg);
    const dropRates = computeCurrentDropRates(upgrades, cfg);
    const counts = { Easy: 0, Medium: 0, Hard: 0, Deadly: 0 };
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const enc = generateEncounter(
        { mode: "uniform", playerLevel: 5, unlockedPairs, dropRates, upgradeState: upgrades },
        rng,
        cfg
      );
      counts[enc.difficulty as keyof typeof counts]++;
    }
    expect(counts.Easy / n).toBeCloseTo(0.2, 1);
    expect(counts.Medium / n).toBeCloseTo(0.4, 1);
    expect(counts.Hard / n).toBeCloseTo(0.3, 1);
    expect(counts.Deadly / n).toBeCloseTo(0.1, 1);
  });

  it("item levels never exceed max_item_level formula", () => {
    const rng = mulberry32(55);
    const upgrades = defaultUpgrades();
    const unlockedPairs = getUnlockedGeneratorsAndChains(5, cfg);
    const dropRates = computeCurrentDropRates(upgrades, cfg);
    const playerLevel = 5;
    const maxItemLevel = Math.min(10, Math.max(1, Math.floor(playerLevel / 5) + 2));

    for (let i = 0; i < 200; i++) {
      const enc = generateEncounter(
        { mode: "uniform", playerLevel, unlockedPairs, dropRates, upgradeState: upgrades },
        rng,
        cfg
      );
      for (const item of enc.requiredItems) {
        expect(item.level).toBeLessThanOrEqual(maxItemLevel);
        expect(item.level).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("at player level 1, only Gen1 and Gen2 chains A/B appear (gating)", () => {
    const rng = mulberry32(11);
    const upgrades = defaultUpgrades();
    const unlockedPairs = getUnlockedGeneratorsAndChains(1, cfg);
    const dropRates = computeCurrentDropRates(upgrades, cfg);

    // Level 1 unlocks: Gen1(A,B), Gen2(A,B)
    const allowedGens = new Set(["Gen1", "Gen2"]);
    const allowedChains = new Set(["ChainA", "ChainB"]);

    for (let i = 0; i < 200; i++) {
      const enc = generateEncounter(
        { mode: "uniform", playerLevel: 1, unlockedPairs, dropRates, upgradeState: upgrades },
        rng,
        cfg
      );
      for (const item of enc.requiredItems) {
        expect(allowedGens.has(item.generator)).toBe(true);
        expect(allowedChains.has(item.chain)).toBe(true);
      }
    }
  });

  it("at player level 15, Gen6 chain A appears", () => {
    const unlockedPairs = getUnlockedGeneratorsAndChains(15, cfg);

    const hasGen6 = unlockedPairs.some(p => p.gen === "Gen6");
    expect(hasGen6).toBe(true);
  });
});

describe("getUnlockedGeneratorsAndChains", () => {
  it("level 1 unlocks exactly Gen1 A/B and Gen2 A/B", () => {
    const pairs = getUnlockedGeneratorsAndChains(1, cfg);
    const keys = pairs.map(p => `${p.gen}_${p.chain}`).sort();
    expect(keys).toEqual(["Gen1_ChainA", "Gen1_ChainB", "Gen2_ChainA", "Gen2_ChainB"].sort());
  });

  it("level 3 adds Gen3 ChainA", () => {
    const pairs = getUnlockedGeneratorsAndChains(3, cfg);
    const hasGen3 = pairs.some(p => p.gen === "Gen3" && p.chain === "ChainA");
    expect(hasGen3).toBe(true);
  });

  it("level 10 adds Gen5 and Gen2 ChainC", () => {
    const pairs = getUnlockedGeneratorsAndChains(10, cfg);
    expect(pairs.some(p => p.gen === "Gen5")).toBe(true);
    expect(pairs.some(p => p.gen === "Gen2" && p.chain === "ChainC")).toBe(true);
  });
});

describe("CR_XP_MAP", () => {
  it("matches the balance.json values", () => {
    for (let l = 1; l <= 10; l++) {
      expect(CR_XP_MAP[l]).toBe(Number(cfg.encounterGeneration.CR_XP_MAP[String(l)]));
    }
  });
});
