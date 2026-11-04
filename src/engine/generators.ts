import { GeneratorId, GeneratorState, Grid, ItemId, UpgradeState, ChainId } from "./types";
import { RNG, weightedChoice } from "./rng";
import { BalanceConfig } from "./config";
import { placeItem } from "./board";

export function computeMaxCharges(
  genId: GeneratorId,
  upgradeState: UpgradeState,
  cfg: BalanceConfig
): number {
  const gen = cfg.generators[genId];
  if (!gen || gen.infinite) return Infinity;
  const boostTier = upgradeState.capacityBoost;
  const multiplier = boostTier > 0
    ? cfg.upgradeCosts.capacityBoost.multipliers![boostTier - 1]
    : 1.0;
  return Math.floor(gen.baseCapacity * multiplier);
}

export function computeCharges(
  state: GeneratorState,
  now: number,
  upgradeState: UpgradeState,
  cfg: BalanceConfig
): GeneratorState {
  const gen = cfg.generators[state.id];
  if (!gen || gen.infinite) return state;

  const maxCharges = computeMaxCharges(state.id, upgradeState, cfg);
  if (state.charges >= maxCharges) return { ...state, maxCharges };

  const cooldownReductionTier = upgradeState.generatorCooldownReduction;
  const reductionFactor = cooldownReductionTier > 0
    ? cfg.upgradeCosts.generatorCooldownReduction.percentValues![cooldownReductionTier - 1]
    : 0;
  const effectiveRechargeTime = gen.fullRechargeTimeMs * (1 - reductionFactor);
  const perChargeMs = effectiveRechargeTime / gen.baseCapacity;

  const elapsed = now - state.lastRechargeTime;
  const gained = Math.floor(elapsed / perChargeMs);

  if (gained <= 0) return { ...state, maxCharges };

  const newCharges = Math.min(state.charges + gained, maxCharges);
  const usedMs = gained * perChargeMs;
  const newLastRecharge = state.lastRechargeTime + usedMs;

  return { ...state, charges: newCharges, maxCharges, lastRechargeTime: newLastRecharge };
}

export function computeCurrentChainRates(
  genId: GeneratorId,
  upgradeState: UpgradeState,
  cfg: BalanceConfig
): Record<ChainId, number> {
  const gen = cfg.generators[genId];
  const baseRates = gen.chains as Record<ChainId, { baseDropRate: number }>;
  const rates: Record<ChainId, number> = {} as Record<ChainId, number>;

  const secondaryTier = upgradeState.secondaryDropBoost;
  const tertiaryTier = upgradeState.tertiaryDropBoost;

  const secondaryBoostValues = cfg.upgradeCosts.secondaryDropBoost.values!;
  const tertiaryBoostValues = cfg.upgradeCosts.tertiaryDropBoost.values!;

  const newChainB = secondaryTier > 0 ? secondaryBoostValues[secondaryTier - 1] : null;
  const newChainC = tertiaryTier > 0 ? tertiaryBoostValues[tertiaryTier - 1] : null;

  for (const [chain, { baseDropRate }] of Object.entries(baseRates) as [ChainId, { baseDropRate: number }][]) {
    rates[chain] = baseDropRate;
  }

  if ("ChainB" in rates && newChainB !== null) {
    const delta = newChainB - (baseRates["ChainB"]?.baseDropRate ?? 0);
    rates["ChainB"] = newChainB;
    rates["ChainA"] = Math.max(0, (rates["ChainA"] ?? 0) - delta);
  }

  if ("ChainC" in rates && newChainC !== null) {
    const baseC = baseRates["ChainC"]?.baseDropRate ?? 0;
    const delta = newChainC - baseC;
    rates["ChainC"] = newChainC;
    rates["ChainA"] = Math.max(0, (rates["ChainA"] ?? 0) - delta);
  }

  return rates;
}

export function rollDrop(
  genState: GeneratorState,
  rng: RNG,
  upgradeState: UpgradeState,
  cfg: BalanceConfig
): ItemId {
  const gen = cfg.generators[genState.id];

  let generator = genState.id;
  let chain: ChainId;

  if (gen.dropsGen1ChainA) {
    generator = "Gen1";
    chain = "ChainA";
  } else {
    const rates = computeCurrentChainRates(genState.id, upgradeState, cfg);
    const chains = Object.keys(rates) as ChainId[];
    const weights = chains.map(c => rates[c]);
    chain = weightedChoice(chains, weights, rng);
  }

  const genUpgradeLevel = upgradeState.generatorLevels[genState.id] ?? 1;
  const dropTable = cfg.generatorDropLevels[genUpgradeLevel - 1];
  const levels = dropTable.map(e => e.level);
  const weights = dropTable.map(e => e.weight);
  let level = weightedChoice(levels, weights, rng);

  const luckyTier = upgradeState.luckyDropChance;
  if (luckyTier > 0) {
    const luckyChance = cfg.upgradeCosts.luckyDropChance.values![luckyTier - 1];
    if (rng() < luckyChance) {
      const bonus = rng() < cfg.luckyDrop.plusTwoChance ? 2 : 3;
      level = Math.min(10, level + bonus);
    }
  }

  return { generator: generator as GeneratorId, chain, level };
}

export type TapResult = {
  grid: Grid;
  gen: GeneratorState;
  dropped: ItemId | null;
  feedback: "ok" | "no_charges" | "board_full";
};

export function tapGenerator(
  grid: Grid,
  gen: GeneratorState,
  now: number,
  rng: RNG,
  upgradeState: UpgradeState,
  cfg: BalanceConfig
): TapResult {
  const genCfg = cfg.generators[gen.id];

  const updatedGen = genCfg.infinite ? gen : computeCharges(gen, now, upgradeState, cfg);

  if (!genCfg.infinite && updatedGen.charges <= 0) {
    return { grid, gen: updatedGen, dropped: null, feedback: "no_charges" };
  }

  const genIndex = grid.findIndex(
    c => c?.type === "generator" && c.generatorId === gen.id
  );
  const spawnNear = genIndex >= 0 ? genIndex : undefined;
  const item = rollDrop(updatedGen, rng, upgradeState, cfg);

  const newGrid = placeItem(grid, item, spawnNear);
  if (!newGrid) {
    return { grid, gen: updatedGen, dropped: null, feedback: "board_full" };
  }

  const newGen = genCfg.infinite
    ? updatedGen
    : { ...updatedGen, charges: updatedGen.charges - 1 };

  return { grid: newGrid, gen: newGen, dropped: item, feedback: "ok" };
}
