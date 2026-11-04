import rawBalance from '../../config/balance.json';
import type { GeneratorId, ChainId } from '../engine/types';

export interface DropLevelEntry {
  level: number;
  weight: number;
}

export interface ChainConfig {
  baseDropRate: number;
}

export interface GeneratorConfig {
  fullRechargeTimeMs: number;
  baseCapacity: number;
  infinite: boolean;
  maxItemLevel: number;
  chains: Partial<Record<ChainId, ChainConfig>>;
  upgradeable: boolean;
  dropsGen1ChainA?: boolean;
}

export interface UpgradeCostTiers {
  values?: number[];
  costs: number[];
  multipliers?: number[];
  minuteValues?: number[];
  percentValues?: number[];
}

export interface EncounterGenerationConfig {
  xpBudgetBase: number;
  xpBudgetPerLevel: number;
  difficulties: string[];
  difficultyWeights: number[];
  difficultyMultipliers: Record<string, number>;
  CR_XP_MAP: Record<string, number>;
}

export interface GatingEntry {
  gen: GeneratorId;
  chain: ChainId;
}

export interface BalanceConfig {
  generators: Record<GeneratorId, GeneratorConfig>;
  generatorDropLevels: DropLevelEntry[][];
  upgradeCosts: {
    generatorLevel: number[];
    secondaryDropBoost: UpgradeCostTiers;
    tertiaryDropBoost: UpgradeCostTiers;
    luckyDropChance: UpgradeCostTiers;
    goldMultiplier: UpgradeCostTiers;
    encounterSlots: { costs: number[] };
    skillCooldownReduction: UpgradeCostTiers;
    generatorCooldownReduction: UpgradeCostTiers;
    inventorySlots: { costs: number[] };
    mergeCritChance: UpgradeCostTiers;
    capacityBoost: UpgradeCostTiers;
    dailyShop: { level1Cost: number; level2Cost: number };
  };
  luckyDrop: { plusTwoChance: number; plusThreeChance: number };
  goldMultipliers: number[];
  encounterSlots: { base: number; max: number };
  encounterGeneration: EncounterGenerationConfig;
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

export const balance: BalanceConfig = rawBalance as unknown as BalanceConfig;
export default balance;
