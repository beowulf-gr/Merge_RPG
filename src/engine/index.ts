import {
  Encounter,
  GameState,
  GeneratorId,
  Grid,
  ItemId,
  PlayerClass,
  RecipeId,
  UpgradeState,
} from "./types";
import { RNG, createRng } from "./rng";
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
import { computeCharges, computeMaxCharges, tapGenerator, TapResult } from "./generators";
import {
  generateEncounter,
  generateSpecialEncounter,
  getUnlockedGeneratorsAndChains,
  computeCurrentDropRates,
  findRecipeForPair,
  goldMultiplierFor,
  EncounterGenConfig,
} from "./encounters";
import { planFulfilment } from "./fulfilment";
import { sellPrice } from "./selling";

export type { BalanceConfig, RecipeConfig } from "./config";
export { loadBalance, validateBalance } from "./config";
export { mulberry32, createRng, weightedChoice, pickOne } from "./rng";
export type { RNG, StatefulRng } from "./rng";
export { wallClock } from "./clock";
export * from "./types";
export * from "./board";
export * from "./generators";
export * from "./encounters";
export * from "./fulfilment";
export * from "./selling";

export interface EngineContext {
  rng: RNG;
  now: number;
  config: BalanceConfig;
}

export type Action =
  | { type: "TAP_GENERATOR"; generatorId: GeneratorId }
  /** Drag `from` onto `to`: move to empty, merge identical items, craft a recipe, or swap. */
  | { type: "DROP_ITEM"; from: number; to: number }
  /** @deprecated alias of DROP_ITEM */
  | { type: "MOVE_ITEM"; from: number; to: number }
  /** @deprecated alias of DROP_ITEM */
  | { type: "MERGE"; from: number; to: number }
  | { type: "SELL_ITEM"; cell: number }
  | { type: "COMPLETE_ENCOUNTER"; encounterId: string }
  | { type: "DISMISS_ENCOUNTER"; encounterId: string }
  | { type: "TICK" };

export type EngineEvent =
  | { type: "tap"; generatorId: GeneratorId; feedback: TapResult["feedback"]; cell?: number }
  | { type: "moved"; from: number; to: number }
  | { type: "swapped"; from: number; to: number }
  | { type: "merged"; cell: number; item: ItemId; critCell: number | null }
  | { type: "crafted"; cell: number; recipeId: RecipeId }
  | { type: "sold"; cell: number; gold: number }
  | { type: "encounterCompleted"; encounterId: string; gold: number; xp: number; special: boolean }
  | { type: "encounterNotReady"; encounterId: string }
  | { type: "specialEncounterSpawned"; encounterId: string };

export interface StepResult {
  state: GameState;
  events: EngineEvent[];
}

export function defaultUpgrades(): UpgradeState {
  return {
    generatorLevels: { Gen0: 1, Gen1: 1, Gen2: 1, Gen3: 1, Gen4: 1, Gen5: 1, Gen6: 1 },
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

function encGenConfig(state: GameState, config: BalanceConfig): EncounterGenConfig {
  return {
    mode: "weighted",
    playerLevel: state.playerLevel,
    unlockedPairs: getUnlockedGeneratorsAndChains(state.playerLevel, config),
    dropRates: computeCurrentDropRates(state.upgrades, config),
    upgradeState: state.upgrades,
  };
}

function withNewEncounter(state: GameState, rng: RNG, now: number, config: BalanceConfig): GameState {
  const enc = generateEncounter(
    { ...encGenConfig(state, config), id: `enc_${state.nextEncounterId}` },
    rng,
    config,
    now
  );
  return { ...state, encounters: [...state.encounters, enc], nextEncounterId: state.nextEncounterId + 1 };
}

/** Top the order board back up to the slot count. */
function refillEncounters(state: GameState, rng: RNG, now: number, config: BalanceConfig): GameState {
  let s = state;
  while (s.encounters.length < s.upgrades.encounterSlots) s = withNewEncounter(s, rng, now, config);
  return s;
}

function newSpecial(state: GameState, rng: RNG, now: number, config: BalanceConfig): Encounter | null {
  return generateSpecialEncounter(
    { ...encGenConfig(state, config), id: `enc_${state.nextEncounterId}` },
    rng,
    config,
    now
  );
}

/**
 * One special encounter every `specialEncounter.intervalMs` of real time (also offline),
 * at most one waiting. The timer counts from the last spawn; if no recipe is available
 * yet, nothing spawns and one appears as soon as a recipe becomes available.
 */
function maybeSpawnSpecial(state: GameState, rng: RNG, now: number, config: BalanceConfig, events: EngineEvent[]): GameState {
  if (state.specialEncounter) return state;
  if (now - state.lastSpecialEncounterAt < config.specialEncounter.intervalMs) return state;
  const enc = newSpecial(state, rng, now, config);
  if (!enc) return state;
  events.push({ type: "specialEncounterSpawned", encounterId: enc.id });
  return {
    ...state,
    specialEncounter: enc,
    lastSpecialEncounterAt: now,
    nextEncounterId: state.nextEncounterId + 1,
  };
}

export function newGame(
  playerClass: PlayerClass,
  seed: number,
  config: BalanceConfig,
  now: number
): GameState {
  const upgrades = defaultUpgrades();
  let grid: Grid = emptyGrid();

  for (const genId of ["Gen1", "Gen2"] as GeneratorId[]) {
    const g = placeGenerator(grid, genId);
    if (g) grid = g;
  }

  const generators = {} as GameState["generators"];
  for (const genId of ["Gen0", "Gen1", "Gen2", "Gen3", "Gen4", "Gen5", "Gen6"] as GeneratorId[]) {
    const cfg = config.generators[genId];
    generators[genId] = {
      id: genId,
      charges: cfg.infinite ? Infinity : cfg.baseCapacity,
      maxCharges: computeMaxCharges(genId, upgrades, config),
      lastRechargeTime: now,
      upgradeLevel: 1,
    };
  }

  const rng = createRng(seed);
  let state: GameState = {
    grid,
    generators,
    encounters: [],
    specialEncounter: null,
    inventory: new Array(config.inventory.baseSlots).fill(null),
    gold: 0,
    xp: 0,
    playerLevel: 1,
    playerClass,
    upgrades,
    skillCooldownEndsAt: 0,
    lastSpecialEncounterAt: now,
    dailyShopResetAt: now,
    rngSeed: seed,
    rngState: 0,
    nextEncounterId: 1,
  };
  state = refillEncounters(state, rng.next, now, config);
  return { ...state, rngState: rng.getState() };
}

export function tickTime(state: GameState, now: number, config: BalanceConfig): GameState {
  const newGenerators = { ...state.generators };
  for (const genId of Object.keys(newGenerators) as GeneratorId[]) {
    newGenerators[genId] = computeCharges(newGenerators[genId], now, state.upgrades, config);
  }
  return { ...state, generators: newGenerators };
}

function rollMergeCrit(state: GameState, rng: RNG, config: BalanceConfig): boolean {
  const tier = state.upgrades.mergeCritChance;
  if (tier <= 0) return false;
  return rng() < config.upgradeCosts.mergeCritChance.values![tier - 1];
}

function dropItem(state: GameState, from: number, to: number, rng: RNG, config: BalanceConfig, events: EngineEvent[]): GameState {
  const src = state.grid[from];
  if (!src || from === to || to < 0 || to >= state.grid.length) return state;
  const dst = state.grid[to];

  if (dst === null) {
    events.push({ type: "moved", from, to });
    return { ...state, grid: swapCells(state.grid, from, to) };
  }

  if (src.type === "item" && dst.type === "item") {
    if (canMerge(src.item, dst.item)) {
      const merged = mergeItems(src.item);
      let grid = setCell(state.grid, to, { type: "item", item: merged });
      grid = setCell(grid, from, null);
      let critCell: number | null = null;
      if (rollMergeCrit(state, rng, config)) {
        critCell = findNearestEmpty(grid, to);
        if (critCell !== null) grid = setCell(grid, critCell, { type: "item", item: merged });
      }
      events.push({ type: "merged", cell: to, item: merged, critCell });
      return { ...state, grid };
    }
    const recipe = findRecipeForPair(src.item, dst.item, config);
    if (recipe) {
      let grid = setCell(state.grid, to, { type: "recipe", recipeId: recipe.id });
      grid = setCell(grid, from, null);
      events.push({ type: "crafted", cell: to, recipeId: recipe.id });
      return { ...state, grid };
    }
  }

  events.push({ type: "swapped", from, to });
  return { ...state, grid: swapCells(state.grid, from, to) };
}

function completeEncounter(state: GameState, encounterId: string, rng: RNG, now: number, config: BalanceConfig, events: EngineEvent[]): GameState {
  const isSpecial = state.specialEncounter?.id === encounterId;
  const enc = isSpecial ? state.specialEncounter : state.encounters.find(e => e.id === encounterId);
  if (!enc) return state;

  const plan = planFulfilment(enc, state.grid, state.inventory);
  if (!plan) {
    events.push({ type: "encounterNotReady", encounterId });
    return state;
  }

  let grid = state.grid;
  for (const c of plan.gridCells) grid = setCell(grid, c, null);
  const inventory = state.inventory.slice();
  for (const i of plan.inventorySlots) inventory[i] = null;

  const gold = Math.round(enc.rewards.gold * goldMultiplierFor(state.upgrades, config));
  const xp = enc.rewards.xp;
  events.push({ type: "encounterCompleted", encounterId, gold, xp, special: isSpecial });

  let next: GameState = { ...state, grid, inventory, gold: state.gold + gold, xp: state.xp + xp };
  if (isSpecial) {
    next = { ...next, specialEncounter: null };
    return maybeSpawnSpecial(next, rng, now, config, events);
  }
  next = { ...next, encounters: next.encounters.filter(e => e.id !== encounterId) };
  return refillEncounters(next, rng, now, config);
}

function dismissEncounter(state: GameState, encounterId: string, rng: RNG, now: number, config: BalanceConfig): GameState {
  if (state.specialEncounter?.id === encounterId) {
    // Dismissing a special encounter rerolls it in place (free, like normal ones).
    const enc = newSpecial(state, rng, now, config);
    return { ...state, specialEncounter: enc, nextEncounterId: state.nextEncounterId + (enc ? 1 : 0) };
  }
  if (!state.encounters.some(e => e.id === encounterId)) return state;
  const next = { ...state, encounters: state.encounters.filter(e => e.id !== encounterId) };
  return refillEncounters(next, rng, now, config);
}

export function step(state: GameState, action: Action, ctx: EngineContext): StepResult {
  const { rng, now, config } = ctx;
  const events: EngineEvent[] = [];
  let next: GameState;

  switch (action.type) {
    case "TICK":
      next = maybeSpawnSpecial(tickTime(state, now, config), rng, now, config, events);
      break;

    case "TAP_GENERATOR": {
      const gen = state.generators[action.generatorId];
      const onBoard = state.grid.some(c => c?.type === "generator" && c.generatorId === action.generatorId);
      if (!gen || !onBoard) {
        next = state;
        break;
      }
      const result = tapGenerator(state.grid, gen, now, rng, state.upgrades, config);
      const cell = result.dropped
        ? result.grid.findIndex((c, i) => c !== state.grid[i])
        : undefined;
      events.push({ type: "tap", generatorId: action.generatorId, feedback: result.feedback, cell });
      next = {
        ...state,
        grid: result.grid,
        generators: { ...state.generators, [action.generatorId]: result.gen },
      };
      break;
    }

    case "DROP_ITEM":
    case "MOVE_ITEM":
    case "MERGE":
      next = dropItem(state, action.from, action.to, rng, config, events);
      break;

    case "SELL_ITEM": {
      const price = sellPrice(state.grid[action.cell] ?? null, config);
      if (price === null) {
        next = state;
        break;
      }
      events.push({ type: "sold", cell: action.cell, gold: price });
      next = { ...state, grid: setCell(state.grid, action.cell, null), gold: state.gold + price };
      break;
    }

    case "COMPLETE_ENCOUNTER":
      next = completeEncounter(state, action.encounterId, rng, now, config, events);
      break;

    case "DISMISS_ENCOUNTER":
      next = dismissEncounter(state, action.encounterId, rng, now, config);
      break;

    default:
      next = state;
  }
  return { state: next, events };
}

export function applyAction(state: GameState, action: Action, ctx: EngineContext): GameState {
  return step(state, action, ctx).state;
}
