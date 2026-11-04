import { describe, it, expect } from "vitest";
import { loadBalance, validateBalance } from "../src/engine/config";

const cfg = loadBalance();

describe("balance.json structure", () => {
  it("loads without error", () => {
    expect(cfg).toBeDefined();
    expect(cfg.generators).toBeDefined();
  });

  it("passes validateBalance", () => {
    expect(() => validateBalance(cfg)).not.toThrow();
  });

  it("all generator chain rates sum to 1.0", () => {
    for (const [genId, gen] of Object.entries(cfg.generators)) {
      if (gen.infinite) continue;
      const total = Object.values(gen.chains).reduce((s, c) => s + c.baseDropRate, 0);
      expect(total).toBeCloseTo(1.0, 2, `${genId} chain rates`);
    }
  });

  it("all drop level tables sum to 1.0", () => {
    for (let i = 0; i < cfg.generatorDropLevels.length; i++) {
      const total = cfg.generatorDropLevels[i].reduce((s, e) => s + e.weight, 0);
      expect(total).toBeCloseTo(1.0, 2, `dropLevels[${i}]`);
    }
  });

  it("has 10 drop level table entries (one per generator upgrade level)", () => {
    expect(cfg.generatorDropLevels).toHaveLength(10);
  });

  it("CR_XP_MAP has entries for levels 1-10", () => {
    for (let l = 1; l <= 10; l++) {
      expect(cfg.encounterGeneration.CR_XP_MAP[String(l)]).toBeGreaterThan(0);
    }
  });

  it("max reachable player level is exactly 100", () => {
    // 54 generator levels: 6 upgradeable gens × 9 tiers (L2–L10)
    const genLevels = 6 * 9; // 54
    // upgrade tiers from §9.4
    const secondaryBoost = cfg.upgradeCosts.secondaryDropBoost.costs.length; // 3
    const tertiaryBoost = cfg.upgradeCosts.tertiaryDropBoost.costs.length; // 3
    const luckyDrop = cfg.upgradeCosts.luckyDropChance.costs.length; // 4
    const goldMult = cfg.upgradeCosts.goldMultiplier.costs.length; // 4
    const encSlots = cfg.upgradeCosts.encounterSlots.costs.length; // 4
    const skillCD = cfg.upgradeCosts.skillCooldownReduction.costs.length; // 3
    const genCD = cfg.upgradeCosts.generatorCooldownReduction.costs.length; // 3
    const inventory = cfg.upgradeCosts.inventorySlots.costs.length; // 10
    const mergeCrit = cfg.upgradeCosts.mergeCritChance.costs.length; // 6
    const capacity = cfg.upgradeCosts.capacityBoost.costs.length; // 6

    const total =
      genLevels + secondaryBoost + tertiaryBoost + luckyDrop +
      goldMult + encSlots + skillCD + genCD + inventory + mergeCrit + capacity;

    expect(total).toBe(100);
  });
});
