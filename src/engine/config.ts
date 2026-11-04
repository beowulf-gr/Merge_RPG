import rawBalance from "../../config/balance.json";

export interface GeneratorChainConfig {
  baseDropRate: number;
}

export interface GeneratorConfig {
  fullRechargeTimeMs: number;
  baseCapacity: number;
  infinite: boolean;
  maxItemLevel: number;
  chains: Record<string, GeneratorChainConfig>;
  upgradeable: boolean;
  dropsGen1ChainA?: boolean;
}

export interface DropLevelEntry {
  level: number;
  weight: number;
}

export interface UpgradeCostTier {
  values?: number[];
  costs: number[];
  multipliers?: number[];
  minuteValues?: number[];
  percentValues?: number[];
}

export interface GatingEntry {
  gen: string;
  chain: string;
}

export interface RecipeConfig {
  id: string;
  /** true while the ingredient chains are placeholders awaiting Vassilis. */
  placeholder?: boolean;
  ingredients: { generator: string; chain: string; level: number }[];
}

export interface BalanceConfig {
  generators: Record<string, GeneratorConfig>;
  generatorDropLevels: DropLevelEntry[][];
  upgradeCosts: {
    generatorLevel: number[];
    secondaryDropBoost: UpgradeCostTier;
    tertiaryDropBoost: UpgradeCostTier;
    luckyDropChance: UpgradeCostTier;
    goldMultiplier: UpgradeCostTier;
    encounterSlots: { costs: number[] };
    skillCooldownReduction: UpgradeCostTier;
    generatorCooldownReduction: UpgradeCostTier;
    inventorySlots: { costs: number[] };
    mergeCritChance: UpgradeCostTier;
    capacityBoost: UpgradeCostTier;
    dailyShop: { level1Cost: number; level2Cost: number };
  };
  luckyDrop: { plusTwoChance: number; plusThreeChance: number };
  goldMultipliers: number[];
  encounterSlots: { base: number; max: number };
  encounterGeneration: {
    xpBudgetBase: number;
    xpBudgetPerLevel: number;
    difficulties: string[];
    difficultyWeights: number[];
    difficultyMultipliers: Record<string, number>;
    CR_XP_MAP: Record<string, number>;
  };
  gating: Record<string, GatingEntry[]>;
  minChainRequestWeight: number;
  generatorRequestWeights: Record<string, number>;
  skillCooldownBase: number;
  inventory: { baseSlots: number; maxPurchasable: number };
  grid: { cols: number; rows: number };
  castle: Record<string, { name: string; upgrades: { name: string; cost: number }[] }>;
  selling: { normalItemFraction: number; recipeItemFraction: number };
  recipes: RecipeConfig[];
  specialEncounter: { intervalMs: number; xpBudgetMultiplier: number; rewardMultiplier: number };
}

export function loadBalance(): BalanceConfig {
  return rawBalance as BalanceConfig;
}

export function validateBalance(cfg: BalanceConfig): void {
  for (const [genId, gen] of Object.entries(cfg.generators)) {
    if (!gen.infinite) {
      const total = Object.values(gen.chains).reduce((s, c) => s + c.baseDropRate, 0);
      if (Math.abs(total - 1.0) > 0.001) {
        throw new Error(`${genId} chain drop rates sum to ${total}, expected 1.0`);
      }
    }
  }

  for (let i = 0; i < cfg.generatorDropLevels.length; i++) {
    const table = cfg.generatorDropLevels[i];
    const total = table.reduce((s, e) => s + e.weight, 0);
    if (Math.abs(total - 1.0) > 0.001) {
      throw new Error(`generatorDropLevels[${i}] weights sum to ${total}, expected 1.0`);
    }
  }

  const seen = new Set<string>();
  for (const r of cfg.recipes) {
    if (seen.has(r.id)) throw new Error(`Duplicate recipe id ${r.id}`);
    seen.add(r.id);
    if (r.ingredients.length !== 2) {
      throw new Error(`Recipe ${r.id} must have exactly 2 ingredients`);
    }
    for (const ing of r.ingredients) {
      const gen = cfg.generators[ing.generator];
      if (!gen || !gen.chains[ing.chain]) {
        throw new Error(`Recipe ${r.id} ingredient ${ing.generator}_${ing.chain} does not exist`);
      }
      if (ing.generator === "Gen0") {
        throw new Error(`Recipe ${r.id} cannot use Gen0 (it produces Gen1 ChainA items)`);
      }
      if (!Number.isInteger(ing.level) || ing.level < 1 || ing.level > 10) {
        throw new Error(`Recipe ${r.id} ingredient level ${ing.level} out of range`);
      }
    }
    const [a, b] = r.ingredients;
    if (a.generator === b.generator && a.chain === b.chain && a.level === b.level) {
      throw new Error(`Recipe ${r.id} uses two identical ingredients (conflicts with merging)`);
    }
  }
  const pairKeys = new Set<string>();
  for (const r of cfg.recipes) {
    const k = r.ingredients
      .map(i => `${i.generator}_${i.chain}_L${i.level}`)
      .sort()
      .join("+");
    if (pairKeys.has(k)) throw new Error(`Two recipes share ingredients ${k}`);
    pairKeys.add(k);
  }
}
