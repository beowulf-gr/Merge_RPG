import { describe, it, expect } from "vitest";
import {
  loadBalance,
  validateBalance,
  mulberry32,
  defaultUpgrades,
  recipeValue,
  getRecipe,
  getAvailableRecipes,
  findRecipeForPair,
  generateSpecialEncounter,
  getUnlockedGeneratorsAndChains,
  computeCurrentDropRates,
  crXpMapFrom,
  baseXpBudget,
  rewardGold,
  rewardXp,
  BalanceConfig,
  EncounterGenConfig,
} from "../../src/engine";

const cfg = loadBalance();

function genCfg(playerLevel: number): EncounterGenConfig {
  const upgrades = defaultUpgrades();
  return {
    mode: "weighted",
    playerLevel,
    unlockedPairs: getUnlockedGeneratorsAndChains(playerLevel, cfg),
    dropRates: computeCurrentDropRates(upgrades, cfg),
    upgradeState: upgrades,
  };
}

describe("recipe config", () => {
  it("recipes are flagged as placeholders until real chains are supplied", () => {
    for (const r of cfg.recipes) expect(r.placeholder).toBe(true);
  });

  it("validateBalance rejects broken recipes", () => {
    const clone = (): BalanceConfig => JSON.parse(JSON.stringify(cfg));
    const bad1 = clone();
    bad1.recipes[0].ingredients[0].chain = "ChainC"; // Gen1 has no ChainC
    expect(() => validateBalance(bad1)).toThrow(/does not exist/);

    const bad2 = clone();
    bad2.recipes[0].ingredients[1] = { ...bad2.recipes[0].ingredients[0] };
    expect(() => validateBalance(bad2)).toThrow(/identical/);

    const bad3 = clone();
    bad3.recipes[1] = { ...bad3.recipes[0], id: "recipe2" };
    expect(() => validateBalance(bad3)).toThrow(/share ingredients/);

    const bad4 = clone();
    bad4.recipes[0].ingredients[0].level = 11;
    expect(() => validateBalance(bad4)).toThrow(/out of range/);
  });
});

describe("recipeValue", () => {
  it("is the sum of ingredient CR XP (GDD example L6 + L5 = 1,150)", () => {
    expect(recipeValue(getRecipe("recipe1", cfg)!, cfg)).toBe(700 + 450);
    expect(recipeValue(getRecipe("recipe2", cfg)!, cfg)).toBe(1800 + 200);
  });
});

describe("findRecipeForPair", () => {
  const a = { generator: "Gen1", chain: "ChainA", level: 6 } as const;
  const b = { generator: "Gen4", chain: "ChainA", level: 5 } as const;

  it("matches in either order", () => {
    expect(findRecipeForPair(a, b, cfg)?.id).toBe("recipe1");
    expect(findRecipeForPair(b, a, cfg)?.id).toBe("recipe1");
  });

  it("requires exact levels and chains", () => {
    expect(findRecipeForPair({ ...a, level: 5 }, b, cfg)).toBeNull();
    expect(findRecipeForPair({ ...a, chain: "ChainB" }, b, cfg)).toBeNull();
  });
});

describe("getAvailableRecipes (gating)", () => {
  it("none at level 1, recipe1 from level 6 (Gen4), recipe2 from level 10 (Gen5)", () => {
    expect(getAvailableRecipes(1, cfg)).toHaveLength(0);
    expect(getAvailableRecipes(5, cfg)).toHaveLength(0);
    expect(getAvailableRecipes(6, cfg).map(r => r.id)).toEqual(["recipe1"]);
    expect(getAvailableRecipes(10, cfg).map(r => r.id).sort()).toEqual(["recipe1", "recipe2"]);
  });
});

describe("generateSpecialEncounter", () => {
  it("returns null when no recipe is available", () => {
    expect(generateSpecialEncounter(genCfg(1), mulberry32(1), cfg)).toBeNull();
  });

  it("requires one available recipe and fills the rest of a 2.5x budget", () => {
    const crMap = crXpMapFrom(cfg);
    const rng = mulberry32(7);
    for (let i = 0; i < 300; i++) {
      const level = 6 + (i % 40);
      const enc = generateSpecialEncounter(genCfg(level), rng, cfg)!;
      expect(enc.isSpecial).toBe(true);
      const recipe = getRecipe(enc.requiredRecipe!, cfg)!;
      expect(getAvailableRecipes(level, cfg)).toContainEqual(recipe);

      const value = recipeValue(recipe, cfg);
      const target =
        baseXpBudget(level, cfg) *
        cfg.encounterGeneration.difficultyMultipliers[enc.difficulty] *
        cfg.specialEncounter.xpBudgetMultiplier;
      const itemsXp = enc.requiredItems.reduce((s, it) => s + crMap[it.level], 0);
      const actual = value + itemsXp;

      if (value >= target) expect(enc.requiredItems).toHaveLength(0);
      else expect(actual).toBeGreaterThanOrEqual(target - 1e-9);

      expect(enc.rewards.gold).toBe(rewardGold(actual) * 3);
      expect(enc.rewards.xp).toBe(rewardXp(actual) * 3);

      const unlocked = new Set(getUnlockedGeneratorsAndChains(level, cfg).map(p => `${p.gen}_${p.chain}`));
      for (const it of enc.requiredItems) expect(unlocked.has(`${it.generator}_${it.chain}`)).toBe(true);
    }
  });

  it("at level 6 the recipe alone exceeds even a Deadly budget, so no extra items", () => {
    // Base 230; Deadly 2.0 × 2.5 = 1,150 ≤ recipe1 value 1,150.
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const enc = generateSpecialEncounter(genCfg(6), rng, cfg)!;
      expect(enc.requiredItems).toHaveLength(0);
      expect(enc.rewards.gold).toBe(230 * 3);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = generateSpecialEncounter({ ...genCfg(30), id: "x" }, mulberry32(99), cfg);
    const b = generateSpecialEncounter({ ...genCfg(30), id: "x" }, mulberry32(99), cfg);
    expect(a).toEqual(b);
  });
});
