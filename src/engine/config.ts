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
  recipes: { id: string; ingredients: { generator: string; chain: string; level: number }[] }[];
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
}
