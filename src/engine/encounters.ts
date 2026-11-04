import { Encounter, GeneratorId, ChainId, Difficulty, UpgradeState, ItemId } from "./types";
import { RNG, weightedChoice } from "./rng";
import { BalanceConfig, RecipeConfig, loadBalance } from "./config";
import { computeCurrentChainRates } from "./generators";

export type CrXpMap = Record<number, number>;

export function crXpMapFrom(cfg: BalanceConfig): CrXpMap {
  const out: CrXpMap = {};
  for (const [k, v] of Object.entries(cfg.encounterGeneration.CR_XP_MAP)) out[Number(k)] = v;
  return out;
}

/** CR XP per item level, read from balance.json. */
export const CR_XP_MAP: CrXpMap = crXpMapFrom(loadBalance());

export function getMinimumItemsRequired(
  targetXp: number,
  maxLevel: number,
  crMap: CrXpMap = CR_XP_MAP
): number {
  let temp = targetXp;
  let minItems = 0;
  const availableLevels = Object.keys(crMap)
    .map(Number)
    .filter(l => l <= maxLevel)
    .sort((a, b) => b - a);

  for (const lvl of availableLevels) {
    if (temp <= 0) break;
    const xpVal = crMap[lvl];
    const count = Math.floor(temp / xpVal);
    minItems += count;
    temp -= count * xpVal;
  }
  if (temp > 0) minItems += 1;
  return Math.max(1, minItems);
}

/** Script formula: gold = max(10, xp / 5). Also the basis for sell prices (GDD 5.3). */
export function rewardGold(xpValue: number): number {
  return Math.max(10, Math.floor(xpValue / 5));
}

/** Script formula: xp = max(2, xp / 20). */
export function rewardXp(xpValue: number): number {
  return Math.max(2, Math.floor(xpValue / 20));
}

export function maxItemLevelFor(playerLevel: number): number {
  return Math.min(10, Math.max(1, Math.floor(playerLevel / 5) + 2));
}

export function baseXpBudget(playerLevel: number, cfg: BalanceConfig): number {
  const ec = cfg.encounterGeneration;
  return ec.xpBudgetBase + playerLevel * ec.xpBudgetPerLevel;
}

export function goldMultiplierFor(upgrades: UpgradeState, cfg: BalanceConfig): number {
  const tier = upgrades.goldMultiplier;
  return tier > 0 ? cfg.upgradeCosts.goldMultiplier.values![tier - 1] : 1.0;
}

export interface UnlockedGenChain {
  gen: GeneratorId;
  chain: ChainId;
}

export function getUnlockedGeneratorsAndChains(
  playerLevel: number,
  cfg: BalanceConfig
): UnlockedGenChain[] {
  const result: UnlockedGenChain[] = [];
  for (const [lvlStr, entries] of Object.entries(cfg.gating)) {
    if (playerLevel >= parseInt(lvlStr, 10)) {
      for (const e of entries) {
        result.push({ gen: e.gen as GeneratorId, chain: e.chain as ChainId });
      }
    }
  }
  return result;
}

export function computeCurrentDropRates(
  upgradeState: UpgradeState,
  cfg: BalanceConfig
): Record<GeneratorId, Record<ChainId, number>> {
  const result = {} as Record<GeneratorId, Record<ChainId, number>>;
  for (const genId of Object.keys(cfg.generators) as GeneratorId[]) {
    result[genId] = computeCurrentChainRates(genId, upgradeState, cfg);
  }
  return result;
}

export interface EncounterGenConfig {
  mode: "weighted" | "uniform";
  playerLevel: number;
  unlockedPairs: UnlockedGenChain[];
  dropRates: Record<GeneratorId, Record<ChainId, number>>;
  upgradeState: UpgradeState;
  /** Deterministic id; the reducer passes one from GameState.nextEncounterId. */
  id?: string;
}

let _fallbackId = 0;
function resolveId(id: string | undefined): string {
  return id ?? `enc_x${++_fallbackId}`;
}

/**
 * The script's level-distribution step: start every item at L1, then bump random
 * items (below the cap) until the total CR XP reaches the target.
 */
export function rollItemLevels(
  targetXp: number,
  maxItemLevel: number,
  rng: RNG,
  crMap: CrXpMap = CR_XP_MAP
): number[] {
  const minItems = getMinimumItemsRequired(targetXp, maxItemLevel, crMap);
  const countChoice = [minItems, minItems + 1, minItems + 2];
  const targetCount = countChoice[Math.floor(rng() * 3)];
  const itemLevels: number[] = new Array(targetCount).fill(1);
  const total = () => itemLevels.reduce((s, l) => s + crMap[l], 0);

  while (total() < targetXp) {
    const validIndices = itemLevels
      .map((l, i) => (l < maxItemLevel ? i : -1))
      .filter(i => i >= 0);
    if (validIndices.length === 0) break;
    const idx = validIndices[Math.floor(rng() * validIndices.length)];
    itemLevels[idx]++;
  }
  return itemLevels;
}

function pickRequestPair(
  cfgEnc: EncounterGenConfig,
  rng: RNG,
  cfg: BalanceConfig
): UnlockedGenChain {
  const pairs = cfgEnc.unlockedPairs;
  if (cfgEnc.mode === "uniform") {
    return pairs[Math.floor(rng() * pairs.length)];
  }
  const weights = pairs.map(p => {
    const genWeight = cfg.generatorRequestWeights[p.gen] ?? 1.0;
    const chainRate = cfgEnc.dropRates[p.gen]?.[p.chain] ?? cfg.minChainRequestWeight;
    return Math.max(cfg.minChainRequestWeight, genWeight * chainRate);
  });
  return weightedChoice(pairs, weights, rng);
}

function rollDifficulty(rng: RNG, cfg: BalanceConfig): Difficulty {
  const ec = cfg.encounterGeneration;
  return weightedChoice(ec.difficulties as Difficulty[], ec.difficultyWeights, rng);
}

function itemsForLevels(
  levels: number[],
  cfgEnc: EncounterGenConfig,
  rng: RNG,
  cfg: BalanceConfig
): ItemId[] {
  if (levels.length > 0 && cfgEnc.unlockedPairs.length === 0) {
    throw new Error("No unlocked generator/chain pairs for encounter generation");
  }
  return levels.map(level => {
    const p = pickRequestPair(cfgEnc, rng, cfg);
    return { generator: p.gen, chain: p.chain, level };
  });
}

export function generateEncounter(
  cfgEnc: EncounterGenConfig,
  rng: RNG,
  cfg: BalanceConfig,
  now: number = 0
): Encounter {
  const crMap = crXpMapFrom(cfg);
  const difficulty = rollDifficulty(rng, cfg);
  const targetXp =
    baseXpBudget(cfgEnc.playerLevel, cfg) * cfg.encounterGeneration.difficultyMultipliers[difficulty];
  const levels = rollItemLevels(targetXp, maxItemLevelFor(cfgEnc.playerLevel), rng, crMap);
  const requiredItems = itemsForLevels(levels, cfgEnc, rng, cfg);
  const actualXp = levels.reduce((s, l) => s + crMap[l], 0);

  return {
    id: resolveId(cfgEnc.id),
    difficulty,
    requiredItems,
    rewards: { gold: rewardGold(actualXp), xp: rewardXp(actualXp) },
    isSpecial: false,
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// Recipes (GDD 9.3.1)
// ---------------------------------------------------------------------------

/** Recipe value = sum of the ingredients' CR XP (e.g. L6 + L5 = 700 + 450 = 1,150). */
export function recipeValue(recipe: RecipeConfig, cfg: BalanceConfig): number {
  const crMap = crXpMapFrom(cfg);
  return recipe.ingredients.reduce((s, i) => s + crMap[i.level], 0);
}

export function getRecipe(id: string, cfg: BalanceConfig): RecipeConfig | undefined {
  return cfg.recipes.find(r => r.id === id);
}

/** A recipe is available once every ingredient's generator/chain is unlocked. */
export function getAvailableRecipes(playerLevel: number, cfg: BalanceConfig): RecipeConfig[] {
  const unlocked = new Set(
    getUnlockedGeneratorsAndChains(playerLevel, cfg).map(p => `${p.gen}_${p.chain}`)
  );
  return cfg.recipes.filter(r =>
    r.ingredients.every(i => unlocked.has(`${i.generator}_${i.chain}`))
  );
}

/** Order-independent exact match of two items against the recipe list. */
export function findRecipeForPair(a: ItemId, b: ItemId, cfg: BalanceConfig): RecipeConfig | null {
  const same = (x: ItemId, y: { generator: string; chain: string; level: number }) =>
    x.generator === y.generator && x.chain === y.chain && x.level === y.level;
  for (const r of cfg.recipes) {
    const [i1, i2] = r.ingredients;
    if ((same(a, i1) && same(b, i2)) || (same(a, i2) && same(b, i1))) return r;
  }
  return null;
}

/**
 * Special encounter: difficulty rolled as normal, XP budget × specialEncounter.xpBudgetMultiplier.
 * One available recipe (picked uniformly) is required and its value counts toward the budget;
 * normal items fill whatever budget remains. Rewards = normal formula × rewardMultiplier.
 * Returns null when no recipe is available yet.
 */
export function generateSpecialEncounter(
  cfgEnc: EncounterGenConfig,
  rng: RNG,
  cfg: BalanceConfig,
  now: number = 0
): Encounter | null {
  const available = getAvailableRecipes(cfgEnc.playerLevel, cfg);
  if (available.length === 0) return null;

  const crMap = crXpMapFrom(cfg);
  const sp = cfg.specialEncounter;
  const difficulty = rollDifficulty(rng, cfg);
  const targetXp =
    baseXpBudget(cfgEnc.playerLevel, cfg) *
    cfg.encounterGeneration.difficultyMultipliers[difficulty] *
    sp.xpBudgetMultiplier;

  const recipe = available[Math.floor(rng() * available.length)];
  const value = recipeValue(recipe, cfg);
  const remaining = targetXp - value;

  const levels =
    remaining > 0 ? rollItemLevels(remaining, maxItemLevelFor(cfgEnc.playerLevel), rng, crMap) : [];
  const requiredItems = itemsForLevels(levels, cfgEnc, rng, cfg);
  const actualXp = value + levels.reduce((s, l) => s + crMap[l], 0);

  return {
    id: resolveId(cfgEnc.id),
    difficulty,
    requiredItems,
    requiredRecipe: recipe.id,
    rewards: {
      gold: rewardGold(actualXp) * sp.rewardMultiplier,
      xp: rewardXp(actualXp) * sp.rewardMultiplier,
    },
    isSpecial: true,
    createdAt: now,
  };
}
