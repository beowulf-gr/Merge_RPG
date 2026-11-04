import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const balancePath = resolve(__dirname, '../config/balance.json');
const balance = JSON.parse(readFileSync(balancePath, 'utf-8'));

describe('balance.json structure', () => {
  it('has generators Gen1-Gen6', () => {
    for (const id of ['Gen1', 'Gen2', 'Gen3', 'Gen4', 'Gen5', 'Gen6']) {
      expect(balance.generators).toHaveProperty(id);
    }
  });

  it('generator chain drop rates sum to ~1.0', () => {
    for (const [genId, gen] of Object.entries(balance.generators) as [string, any][]) {
      if (gen.infinite) continue;
      const total = Object.values(gen.chains as Record<string, { baseDropRate: number }>)
        .reduce((sum, c) => sum + c.baseDropRate, 0);
      expect(total).toBeCloseTo(1.0, 5);
    }
  });

  it('generatorDropLevels has 10 entries', () => {
    expect(balance.generatorDropLevels).toHaveLength(10);
  });

  it('each generator drop level table sums to ~1.0', () => {
    for (const [i, table] of balance.generatorDropLevels.entries()) {
      const total = (table as { level: number; weight: number }[]).reduce((s: number, e) => s + e.weight, 0);
      expect(total).toBeCloseTo(1.0, 5);
    }
  });

  it('CR_XP_MAP has entries for levels 1-10', () => {
    const map = balance.encounterGeneration.CR_XP_MAP;
    for (let i = 1; i <= 10; i++) {
      expect(map).toHaveProperty(String(i));
    }
  });

  it('upgrade costs have all required keys', () => {
    const uc = balance.upgradeCosts;
    expect(uc).toHaveProperty('generatorLevel');
    expect(uc).toHaveProperty('secondaryDropBoost');
    expect(uc).toHaveProperty('tertiaryDropBoost');
    expect(uc).toHaveProperty('luckyDropChance');
    expect(uc).toHaveProperty('goldMultiplier');
    expect(uc).toHaveProperty('encounterSlots');
    expect(uc).toHaveProperty('skillCooldownReduction');
    expect(uc).toHaveProperty('generatorCooldownReduction');
    expect(uc).toHaveProperty('inventorySlots');
    expect(uc).toHaveProperty('mergeCritChance');
    expect(uc).toHaveProperty('capacityBoost');
  });

  it('maximum reachable player level is exactly 100', () => {
    const uc = balance.upgradeCosts;
    // Generator level upgrades: Gen1-Gen6, each has levels 2-10 = 9 levels each = 54
    const upgradeableGens = Object.entries(balance.generators)
      .filter(([, v]: [string, any]) => v.upgradeable)
      .length;
    expect(upgradeableGens).toBe(6);
    const genLevelTiers = upgradeableGens * 9; // L2 through L10

    const secondaryTiers = uc.secondaryDropBoost.costs.length;   // 3
    const tertiaryTiers  = uc.tertiaryDropBoost.costs.length;    // 3
    const luckyTiers     = uc.luckyDropChance.costs.length;      // 4
    const goldMultTiers  = uc.goldMultiplier.costs.length;       // 4
    const slotTiers      = uc.encounterSlots.costs.length;       // 4
    const skillCDTiers   = uc.skillCooldownReduction.costs.length; // 3
    const genCDTiers     = uc.generatorCooldownReduction.costs.length; // 3
    const inventoryTiers = uc.inventorySlots.costs.length;       // 10
    const critTiers      = uc.mergeCritChance.costs.length;      // 6
    const capacityTiers  = uc.capacityBoost.costs.length;        // 6

    const total =
      genLevelTiers +
      secondaryTiers +
      tertiaryTiers +
      luckyTiers +
      goldMultTiers +
      slotTiers +
      skillCDTiers +
      genCDTiers +
      inventoryTiers +
      critTiers +
      capacityTiers;

    expect(genLevelTiers).toBe(54);
    expect(secondaryTiers).toBe(3);
    expect(tertiaryTiers).toBe(3);
    expect(luckyTiers).toBe(4);
    expect(goldMultTiers).toBe(4);
    expect(slotTiers).toBe(4);
    expect(skillCDTiers).toBe(3);
    expect(genCDTiers).toBe(3);
    expect(inventoryTiers).toBe(10);
    expect(critTiers).toBe(6);
    expect(capacityTiers).toBe(6);
    expect(total).toBe(100);
  });

  it('gating table has required player level keys', () => {
    const gating = balance.gating;
    expect(gating).toHaveProperty('1');
    expect(gating).toHaveProperty('3');
    expect(gating).toHaveProperty('6');
    expect(gating).toHaveProperty('10');
    expect(gating).toHaveProperty('15');
    expect(gating).toHaveProperty('20');
  });

  it('castle has 4 tiers with 5 upgrades each', () => {
    for (const tier of ['tier1', 'tier2', 'tier3', 'tier4']) {
      expect(balance.castle[tier].upgrades).toHaveLength(5);
    }
  });
});
