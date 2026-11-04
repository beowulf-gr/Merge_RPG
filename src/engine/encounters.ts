import { Encounter, GeneratorId, ChainId, Difficulty, UpgradeState } from "./types";
import { RNG, weightedChoice } from "./rng";
import { BalanceConfig } from "./config";
import { computeCurrentChainRates } from "./generators";

export const CR_XP_MAP: Record<number, number> = {
  1: 25, 2: 50, 3: 100, 4: 200, 5: 450,
  6: 700, 7: 1100, 8: 1800, 9: 2300, 10: 2900,
};

export function getMinimumItemsRequired(targetXp: number, maxLevel: number): number {
  let temp = targetXp;
  let minItems = 0;
  const availableLevels = Object.keys(CR_XP_MAP)
    .map(Number)
    .filter(l => l <= maxLevel)
    .sort((a, b) => b - a);

  for (const lvl of availableLevels) {
    if (temp <= 0) break;
    const xpVal = CR_XP_MAP[lvl];
    const count = Math.floor(temp / xpVal);
    minItems += count;
    temp -= count * xpVal;
  }
  if (temp > 0) minItems += 1;
  return Math.max(1, minItems);
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
}

let _encounterId = 0;
function nextId(): string {
  return `enc_${++_encounterId}_${Date.now()}`;
}

export function generateEncounter(
  cfg_enc: EncounterGenConfig,
  rng: RNG,
  cfg: BalanceConfig,
  now: number = Date.now()
): Encounter {
  const ec = cfg.encounterGeneration;
  const baseXp = ec.xpBudgetBase + cfg_enc.playerLevel * ec.xpBudgetPerLevel;
  const difficulties = ec.difficulties as Difficulty[];
  const difficulty = weightedChoice(difficulties, ec.difficultyWeights, rng);
  const targetXp = baseXp * ec.difficultyMultipliers[difficulty];

  const maxItemLevel = Math.min(10, Math.max(1, Math.floor(cfg_enc.playerLevel / 5) + 2));
  const minItems = getMinimumItemsRequired(targetXp, maxItemLevel);

  const countChoice = [minItems, minItems + 1, minItems + 2];
  const targetCount = countChoice[Math.floor(rng() * 3)];

  const itemLevels: number[] = new Array(targetCount).fill(1);

  const currentTotalXp = () => itemLevels.reduce((s, l) => s + CR_XP_MAP[l], 0);

  while (currentTotalXp() < targetXp) {
    const validIndices = itemLevels
      .map((l, i) => (l < maxItemLevel ? i : -1))
      .filter(i => i >= 0);
    if (validIndices.length === 0) break;
    const idx = validIndices[Math.floor(rng() * validIndices.length)];
    itemLevels[idx]++;
  }

  const pairs = cfg_enc.unlockedPairs;
  if (pairs.length === 0) {
    throw new Error("No unlocked generator/chain pairs for encounter generation");
  }

  const requiredItems = itemLevels.map(level => {
    let gen: GeneratorId;
    let chain: ChainId;

    if (cfg_enc.mode === "uniform") {
      const p = pairs[Math.floor(rng() * pairs.length)];
      gen = p.gen;
      chain = p.chain;
    } else {
      const weights = pairs.map(p => {
        const genWeight = cfg.generatorRequestWeights[p.gen] ?? 1.0;
        const chainRate = cfg_enc.dropRates[p.gen]?.[p.chain] ?? cfg.minChainRequestWeight;
        return Math.max(cfg.minChainRequestWeight, genWeight * chainRate);
      });
      const p = weightedChoice(pairs, weights, rng);
      gen = p.gen;
      chain = p.chain;
    }
    return { generator: gen, chain, level };
  });

  const actualXp = currentTotalXp();
  const goldMultiplierTier = cfg_enc.upgradeState.goldMultiplier;
  const goldMult = goldMultiplierTier > 0
    ? cfg.upgradeCosts.goldMultiplier.values![goldMultiplierTier - 1]
    : 1.0;

  return {
    id: nextId(),
    difficulty,
    requiredItems,
    rewards: {
      gold: Math.round(Math.max(10, Math.floor(actualXp / 5)) * goldMult),
      xp: Math.max(2, Math.floor(actualXp / 20)),
    },
    isSpecial: false,
    createdAt: now,
  };
}
