import {
  GameState,
  GeneratorId,
  Grid,
  ItemId,
  PlayerClass,
  UpgradeState,
} from "./types";
import { RNG, mulberry32 } from "./rng";
import { BalanceConfig } from "./config";
import {
  emptyGrid,
  canMerge,
  mergeItems,
  findNearestEmpty,
  setCell,
  swapCells,
  placeGenerator,
} from "./board";
import {
  computeCharges,
  computeMaxCharges,
  tapGenerator,
} from "./generators";
import {
  generateEncounter,
  getUnlockedGeneratorsAndChains,
  computeCurrentDropRates,
} from "./encounters";

export type { BalanceConfig } from "./config";
export { loadBalance, validateBalance } from "./config";
export { mulberry32, weightedChoice, pickOne } from "./rng";
export { wallClock } from "./clock";
export * from "./types";
export * from "./board";
export * from "./generators";
export * from "./encounters";

export interface EngineContext {
  rng: RNG;
  now: number;
  config: BalanceConfig;
}

export type Action =
  | { type: "TAP_GENERATOR"; generatorId: GeneratorId }
  | { type: "MOVE_ITEM"; from: number; to: number }
  | { type: "MERGE"; from: number; to: number }
  | { type: "COMPLETE_ENCOUNTER"; encounterId: string }
  | { type: "DISMISS_ENCOUNTER"; encounterId: string }
  | { type: "TICK" };

function defaultUpgrades(): UpgradeState {
  return {
    generatorLevels: {
      Gen0: 1, Gen1: 1, Gen2: 1, Gen3: 1, Gen4: 1, Gen5: 1, Gen6: 1,
    },
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

export function newGame(
  playerClass: PlayerClass,
  seed: number,
  config: BalanceConfig,
  now: number = Date.now()
): GameState {
  const upgrades = defaultUpgrades();
  let grid: Grid = emptyGrid();

  const startGens: GeneratorId[] = ["Gen1", "Gen2"];
  for (const genId of startGens) {
    const g = placeGenerator(grid, genId);
    if (g) grid = g;
  }

  const generators: GameState["generators"] = {} as GameState["generators"];
  for (const genId of ["Gen0", "Gen1", "Gen2", "Gen3", "Gen4", "Gen5", "Gen6"] as GeneratorId[]) {
    const cfg = config.generators[genId];
    const maxCharges = computeMaxCharges(genId, upgrades, config);
    generators[genId] = {
      id: genId,
      charges: cfg.infinite ? Infinity : cfg.baseCapacity,
      maxCharges,
      lastRechargeTime: now,
      upgradeLevel: 1,
    };
  }

  const rng = mulberry32(seed);
  const unlockedPairs = getUnlockedGeneratorsAndChains(1, config);
  const dropRates = computeCurrentDropRates(upgrades, config);

  const encounters = Array.from({ length: 3 }, () =>
    generateEncounter({ mode: "weighted", playerLevel: 1, unlockedPairs, dropRates, upgradeState: upgrades }, rng, config, now)
  );

  return {
    grid,
    generators,
    encounters,
    inventory: new Array(config.inventory.baseSlots).fill(null),
    gold: 0,
    xp: 0,
    playerLevel: 1,
    playerClass,
    upgrades,
    skillCooldownEndsAt: 0,
    lastSpecialEncounterAt: 0,
    dailyShopResetAt: now,
    rngSeed: seed,
  };
}

export function tickTime(state: GameState, now: number, config: BalanceConfig): GameState {
  const newGenerators = { ...state.generators };
  for (const genId of Object.keys(newGenerators) as GeneratorId[]) {
    newGenerators[genId] = computeCharges(newGenerators[genId], now, state.upgrades, config);
  }
  return { ...state, generators: newGenerators };
}

export function applyAction(state: GameState, action: Action, ctx: EngineContext): GameState {
  const { rng, now, config } = ctx;

  switch (action.type) {
    case "TICK":
      return tickTime(state, now, config);

    case "TAP_GENERATOR": {
      const gen = state.generators[action.generatorId];
      const result = tapGenerator(state.grid, gen, now, rng, state.upgrades, config);
      let grid = result.grid;

      if (result.feedback === "ok" && result.dropped) {
        const critTier = state.upgrades.mergeCritChance;
        if (critTier > 0) {
          const critChance = config.upgradeCosts.mergeCritChance.values![critTier - 1];
          if (rng() < critChance) {
            const genIndex = grid.findIndex(c => c?.type === "generator" && c.generatorId === action.generatorId);
            const secondGrid = findNearestEmpty(grid, genIndex >= 0 ? genIndex : 0);
            if (secondGrid !== null) {
              grid = setCell(grid, secondGrid, { type: "item", item: result.dropped });
            }
          }
        }
      }

      return {
        ...state,
        grid,
        generators: { ...state.generators, [action.generatorId]: result.gen },
      };
    }

    case "MOVE_ITEM": {
      const from = state.grid[action.from];
      const to = state.grid[action.to];
      if (!from) return state;
      if (to === null) {
        return { ...state, grid: swapCells(state.grid, action.from, action.to) };
      }
      return { ...state, grid: swapCells(state.grid, action.from, action.to) };
    }

    case "MERGE": {
      const fromCell = state.grid[action.from];
      const toCell = state.grid[action.to];
      if (
        !fromCell || fromCell.type !== "item" ||
        !toCell || toCell.type !== "item"
      ) return state;
      if (!canMerge(fromCell.item, toCell.item)) {
        return { ...state, grid: swapCells(state.grid, action.from, action.to) };
      }
      const merged = mergeItems(fromCell.item);
      let grid = setCell(state.grid, action.to, { type: "item", item: merged });
      grid = setCell(grid, action.from, null);

      const critTier = state.upgrades.mergeCritChance;
      if (critTier > 0) {
        const critChance = config.upgradeCosts.mergeCritChance.values![critTier - 1];
        if (rng() < critChance) {
          const secondIdx = findNearestEmpty(grid, action.to);
          if (secondIdx !== null) {
            grid = setCell(grid, secondIdx, { type: "item", item: merged });
          }
        }
      }

      return { ...state, grid };
    }

    case "COMPLETE_ENCOUNTER": {
      const enc = state.encounters.find(e => e.id === action.encounterId);
      if (!enc) return state;

      const newEncounters = state.encounters.filter(e => e.id !== action.encounterId);
      const unlockedPairs = getUnlockedGeneratorsAndChains(state.playerLevel, config);
      const dropRates = computeCurrentDropRates(state.upgrades, config);
      newEncounters.push(
        generateEncounter(
          { mode: "weighted", playerLevel: state.playerLevel, unlockedPairs, dropRates, upgradeState: state.upgrades },
          rng,
          config,
          now
        )
      );

      return {
        ...state,
        encounters: newEncounters,
        gold: state.gold + enc.rewards.gold,
        xp: state.xp + enc.rewards.xp,
      };
    }

    case "DISMISS_ENCOUNTER": {
      const newEncounters = state.encounters.filter(e => e.id !== action.encounterId);
      const unlockedPairs = getUnlockedGeneratorsAndChains(state.playerLevel, config);
      const dropRates = computeCurrentDropRates(state.upgrades, config);
      newEncounters.push(
        generateEncounter(
          { mode: "weighted", playerLevel: state.playerLevel, unlockedPairs, dropRates, upgradeState: state.upgrades },
          rng,
          config,
          now
        )
      );
      return { ...state, encounters: newEncounters };
    }

    default:
      return state;
  }
}

export function getDisplay(
  item: ItemId,
  playerClass: PlayerClass,
  items: Record<string, unknown>
): string {
  try {
    const classData = (items as Record<string, { generators: Record<string, { chains: Record<string, string[]> }> }>)[playerClass];
    return classData.generators[item.generator].chains[item.chain][item.level - 1];
  } catch {
    return `${item.generator}_${item.chain}_L${item.level}`;
  }
}
