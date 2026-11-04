import { describe, it, expect } from "vitest";
import {
  loadBalance,
  mulberry32,
  newGame,
  step,
  applyAction,
  sellPrice,
  setCell,
  emptyGrid,
  planFulfilment,
  heldCounts,
  GameState,
  Encounter,
  EngineContext,
  ItemId,
  BalanceConfig,
} from "../../src/engine";

const cfg = loadBalance();
const T0 = 1_000_000;

function ctx(now = T0, seed = 1, config: BalanceConfig = cfg): EngineContext {
  return { rng: mulberry32(seed), now, config };
}

const item = (generator: string, chain: string, level: number): ItemId =>
  ({ generator, chain, level }) as ItemId;

function stateWith(cells: Record<number, ItemId | { recipe: string }>, base?: GameState): GameState {
  const s = base ?? newGame("paladin", 42, cfg, T0);
  let grid = emptyGrid();
  for (const [i, c] of Object.entries(cells)) {
    grid = setCell(
      grid,
      Number(i),
      "recipe" in c ? { type: "recipe", recipeId: c.recipe } : { type: "item", item: c }
    );
  }
  // keep generators on the board at 78/79
  grid = setCell(grid, 78, { type: "generator", generatorId: "Gen1" });
  grid = setCell(grid, 79, { type: "generator", generatorId: "Gen2" });
  return { ...s, grid };
}

describe("newGame", () => {
  it("is deterministic and fills the 3 base encounter slots", () => {
    const a = newGame("rogue", 5, cfg, T0);
    const b = newGame("rogue", 5, cfg, T0);
    expect(a).toEqual(b);
    expect(a.encounters).toHaveLength(3);
    expect(new Set(a.encounters.map(e => e.id)).size).toBe(3);
    expect(a.specialEncounter).toBeNull();
    expect(a.inventory).toEqual([null, null, null, null, null]);
  });
});

describe("DROP_ITEM", () => {
  it("moves onto an empty cell", () => {
    const s = stateWith({ 0: item("Gen1", "ChainA", 1) });
    const r = step(s, { type: "DROP_ITEM", from: 0, to: 5 }, ctx());
    expect(r.state.grid[0]).toBeNull();
    expect(r.state.grid[5]).toEqual({ type: "item", item: item("Gen1", "ChainA", 1) });
  });

  it("merges identical items into level+1 at the target", () => {
    const s = stateWith({ 0: item("Gen1", "ChainA", 3), 1: item("Gen1", "ChainA", 3) });
    const r = step(s, { type: "DROP_ITEM", from: 0, to: 1 }, ctx());
    expect(r.state.grid[0]).toBeNull();
    expect(r.state.grid[1]).toEqual({ type: "item", item: item("Gen1", "ChainA", 4) });
    expect(r.events[0]).toMatchObject({ type: "merged", critCell: null });
  });

  it("merge crit at 100% spawns a second copy in the nearest empty cell", () => {
    const always = JSON.parse(JSON.stringify(cfg)) as BalanceConfig;
    always.upgradeCosts.mergeCritChance.values = [1, 1, 1, 1, 1, 1];
    const base = stateWith({ 0: item("Gen1", "ChainA", 2), 1: item("Gen1", "ChainA", 2) });
    const s = { ...base, upgrades: { ...base.upgrades, mergeCritChance: 1 } };
    const r = step(s, { type: "DROP_ITEM", from: 0, to: 1 }, ctx(T0, 1, always));
    const l3 = r.state.grid.filter(c => c?.type === "item" && c.item.level === 3);
    expect(l3).toHaveLength(2);
  });

  it("L10 + L10 swaps instead of merging", () => {
    const s = stateWith({ 0: item("Gen1", "ChainA", 10), 1: item("Gen1", "ChainB", 10) });
    const s2 = stateWith({ 0: item("Gen1", "ChainA", 10), 1: item("Gen1", "ChainA", 10) });
    expect(step(s2, { type: "DROP_ITEM", from: 0, to: 1 }, ctx()).events[0].type).toBe("swapped");
    expect(step(s, { type: "DROP_ITEM", from: 0, to: 1 }, ctx()).events[0].type).toBe("swapped");
  });

  it("crafts a recipe item from its two ingredients (either direction)", () => {
    const s = stateWith({ 0: item("Gen1", "ChainA", 6), 1: item("Gen4", "ChainA", 5) });
    for (const [from, to] of [[0, 1], [1, 0]]) {
      const r = step(s, { type: "DROP_ITEM", from, to }, ctx());
      expect(r.state.grid[to]).toEqual({ type: "recipe", recipeId: "recipe1" });
      expect(r.state.grid[from]).toBeNull();
      expect(r.events[0]).toEqual({ type: "crafted", cell: to, recipeId: "recipe1" });
    }
  });

  it("recipe items never merge (two identical recipes swap)", () => {
    const s = stateWith({ 0: { recipe: "recipe1" }, 1: { recipe: "recipe1" } });
    const r = step(s, { type: "DROP_ITEM", from: 0, to: 1 }, ctx());
    expect(r.events[0].type).toBe("swapped");
    expect(r.state.grid.filter(c => c?.type === "recipe")).toHaveLength(2);
  });

  it("generators can be moved like items", () => {
    const s = stateWith({});
    const r = step(s, { type: "DROP_ITEM", from: 78, to: 10 }, ctx());
    expect(r.state.grid[10]).toEqual({ type: "generator", generatorId: "Gen1" });
  });
});

describe("TAP_GENERATOR", () => {
  it("spawns next to the generator and does not roll merge crit", () => {
    const always = JSON.parse(JSON.stringify(cfg)) as BalanceConfig;
    always.upgradeCosts.mergeCritChance.values = [1, 1, 1, 1, 1, 1];
    const base = stateWith({});
    const s = { ...base, upgrades: { ...base.upgrades, mergeCritChance: 6 } };
    const r = step(s, { type: "TAP_GENERATOR", generatorId: "Gen1" }, ctx(T0, 1, always));
    expect(r.state.grid.filter(c => c?.type === "item")).toHaveLength(1);
    expect(r.events[0]).toMatchObject({ type: "tap", feedback: "ok" });
  });

  it("ignores generators that are not on the board", () => {
    const s = stateWith({});
    expect(applyAction(s, { type: "TAP_GENERATOR", generatorId: "Gen3" }, ctx())).toBe(s);
  });

  it("a generator that sat full does not instantly refill after a tap", () => {
    let s = stateWith({});
    const hourLater = T0 + 3_600_000;
    s = applyAction(s, { type: "TAP_GENERATOR", generatorId: "Gen1" }, ctx(hourLater));
    s = applyAction(s, { type: "TICK" }, ctx(hourLater + 1000));
    expect(s.generators.Gen1.charges).toBe(49);
  });
});

describe("SELL_ITEM (GDD 5.3)", () => {
  it("normal items sell for 50%: L1 = 5, L4 = 20, L8 = 180", () => {
    const p = (lvl: number) => sellPrice({ type: "item", item: item("Gen1", "ChainA", lvl) }, cfg);
    expect(p(1)).toBe(5);
    expect(p(4)).toBe(20);
    expect(p(8)).toBe(180);
  });

  it("recipe items sell for 100% of value: recipe1 (1,150) = 230", () => {
    expect(sellPrice({ type: "recipe", recipeId: "recipe1" }, cfg)).toBe(230);
  });

  it("generators and empty cells cannot be sold", () => {
    expect(sellPrice({ type: "generator", generatorId: "Gen1" }, cfg)).toBeNull();
    expect(sellPrice(null, cfg)).toBeNull();
  });

  it("removes the item and adds gold; gold multiplier does not apply", () => {
    const base = stateWith({ 3: item("Gen2", "ChainA", 4) });
    const s = { ...base, upgrades: { ...base.upgrades, goldMultiplier: 4 } };
    const r = step(s, { type: "SELL_ITEM", cell: 3 }, ctx());
    expect(r.state.grid[3]).toBeNull();
    expect(r.state.gold).toBe(s.gold + 20);
  });

  it("selling a generator is a no-op", () => {
    const s = stateWith({});
    expect(applyAction(s, { type: "SELL_ITEM", cell: 78 }, ctx())).toBe(s);
  });
});

function encounterOf(items: ItemId[], extra: Partial<Encounter> = {}): Encounter {
  return {
    id: "test_enc",
    difficulty: "Easy",
    requiredItems: items,
    rewards: { gold: 100, xp: 10 },
    isSpecial: false,
    createdAt: T0,
    ...extra,
  };
}

describe("COMPLETE_ENCOUNTER", () => {
  const need = [item("Gen1", "ChainA", 2), item("Gen1", "ChainA", 2), item("Gen2", "ChainB", 1)];

  it("refuses when items are missing and changes nothing", () => {
    const base = stateWith({ 0: item("Gen1", "ChainA", 2), 1: item("Gen2", "ChainB", 1) });
    const s = { ...base, encounters: [encounterOf(need), ...base.encounters.slice(1)] };
    const r = step(s, { type: "COMPLETE_ENCOUNTER", encounterId: "test_enc" }, ctx());
    expect(r.state).toBe(s);
    expect(r.events[0].type).toBe("encounterNotReady");
  });

  it("consumes exactly the required items, grants rewards and refills the slot", () => {
    const base = stateWith({
      0: item("Gen1", "ChainA", 2),
      1: item("Gen1", "ChainA", 2),
      2: item("Gen1", "ChainA", 2),
      3: item("Gen2", "ChainB", 1),
    });
    const s = { ...base, encounters: [encounterOf(need), ...base.encounters.slice(1)] };
    const r = step(s, { type: "COMPLETE_ENCOUNTER", encounterId: "test_enc" }, ctx());
    expect(r.state.grid.filter(c => c?.type === "item")).toHaveLength(1);
    expect(r.state.gold).toBe(100);
    expect(r.state.xp).toBe(10);
    expect(r.state.encounters).toHaveLength(3);
    expect(r.state.encounters.some(e => e.id === "test_enc")).toBe(false);
  });

  it("applies the gold multiplier to Gold only", () => {
    const base = stateWith({ 0: item("Gen1", "ChainA", 1) });
    const s = {
      ...base,
      upgrades: { ...base.upgrades, goldMultiplier: 2 },
      encounters: [encounterOf([item("Gen1", "ChainA", 1)])],
    };
    const r = step(s, { type: "COMPLETE_ENCOUNTER", encounterId: "test_enc" }, ctx());
    expect(r.state.gold).toBe(150);
    expect(r.state.xp).toBe(10);
  });

  it("inventory items count toward fulfilment", () => {
    const s = { ...stateWith({}), inventory: [item("Gen1", "ChainA", 1), null] };
    const plan = planFulfilment(encounterOf([item("Gen1", "ChainA", 1)]), s.grid, s.inventory);
    expect(plan).toEqual({ gridCells: [], inventorySlots: [0] });
  });

  it("recipe items do not satisfy normal item requirements", () => {
    const s = stateWith({ 0: { recipe: "recipe1" } });
    const enc = encounterOf([item("Gen1", "ChainA", 6)]);
    expect(planFulfilment(enc, s.grid, [])).toBeNull();
  });

  it("heldCounts reports progress per required item", () => {
    const s = stateWith({ 0: item("Gen1", "ChainA", 2) });
    const counts = heldCounts(encounterOf(need), s.grid, []);
    expect(counts.get("Gen1_ChainA_L2")).toEqual({ need: 2, have: 1 });
    expect(counts.get("Gen2_ChainB_L1")).toEqual({ need: 1, have: 0 });
  });
});

describe("DISMISS_ENCOUNTER", () => {
  it("replaces the encounter for free", () => {
    const s = newGame("bard", 3, cfg, T0);
    const id = s.encounters[0].id;
    const r = applyAction(s, { type: "DISMISS_ENCOUNTER", encounterId: id }, ctx());
    expect(r.encounters).toHaveLength(3);
    expect(r.encounters.some(e => e.id === id)).toBe(false);
    expect(r.gold).toBe(0);
  });
});

describe("special encounters (GDD 9.3.1)", () => {
  const H4 = cfg.specialEncounter.intervalMs;

  it("never spawn while no recipe is available (level 1)", () => {
    const s = newGame("wizard", 1, cfg, T0);
    const r = applyAction(s, { type: "TICK" }, ctx(T0 + 10 * H4));
    expect(r.specialEncounter).toBeNull();
  });

  it("spawn once 4h have passed, at most one waiting", () => {
    const s = { ...newGame("wizard", 1, cfg, T0), playerLevel: 10 };
    expect(applyAction(s, { type: "TICK" }, ctx(T0 + H4 - 1)).specialEncounter).toBeNull();

    const r = step(s, { type: "TICK" }, ctx(T0 + H4));
    expect(r.state.specialEncounter?.isSpecial).toBe(true);
    expect(r.events).toContainEqual({ type: "specialEncounterSpawned", encounterId: r.state.specialEncounter!.id });

    const later = applyAction(r.state, { type: "TICK" }, ctx(T0 + 5 * H4));
    expect(later.specialEncounter).toEqual(r.state.specialEncounter);
  });

  it("spawn immediately when the recipe unlocks if the timer already elapsed (offline)", () => {
    let s = newGame("cleric", 1, cfg, T0);
    s = applyAction(s, { type: "TICK" }, ctx(T0 + 3 * H4));
    expect(s.specialEncounter).toBeNull();
    s = { ...s, playerLevel: 6 };
    s = applyAction(s, { type: "TICK" }, ctx(T0 + 3 * H4 + 1));
    expect(s.specialEncounter?.requiredRecipe).toBe("recipe1");
  });

  it("completing consumes the recipe item and pays 3x (with gold multiplier on Gold)", () => {
    let s = { ...newGame("paladin", 2, cfg, T0), playerLevel: 6 };
    s = applyAction(s, { type: "TICK" }, ctx(T0 + H4));
    const enc = s.specialEncounter!;
    expect(enc.requiredItems).toHaveLength(0);
    s = { ...stateWith({ 4: { recipe: "recipe1" } }, s), upgrades: { ...s.upgrades, goldMultiplier: 1 } };
    const r = step(s, { type: "COMPLETE_ENCOUNTER", encounterId: enc.id }, ctx(T0 + H4 + 10));
    expect(r.state.grid[4]).toBeNull();
    expect(r.state.gold).toBe(Math.round(690 * 1.25));
    expect(r.state.xp).toBe(57 * 3);
    expect(r.state.specialEncounter).toBeNull();
    // next one only after another 4h from the last spawn
    expect(applyAction(r.state, { type: "TICK" }, ctx(T0 + 2 * H4 - 1)).specialEncounter).toBeNull();
    expect(applyAction(r.state, { type: "TICK" }, ctx(T0 + 2 * H4)).specialEncounter).not.toBeNull();
  });

  it("dismissing empties the slot; the next one waits for the 4h timer", () => {
    let s = { ...newGame("paladin", 2, cfg, T0), playerLevel: 30 };
    s = applyAction(s, { type: "TICK" }, ctx(T0 + H4));
    const old = s.specialEncounter!;
    const r = applyAction(s, { type: "DISMISS_ENCOUNTER", encounterId: old.id }, ctx(T0 + H4 + 1, 9));
    expect(r.specialEncounter).toBeNull();
    expect(r.encounters).toEqual(s.encounters);
    expect(applyAction(r, { type: "TICK" }, ctx(T0 + 2 * H4 - 1)).specialEncounter).toBeNull();
    expect(applyAction(r, { type: "TICK" }, ctx(T0 + 2 * H4)).specialEncounter).not.toBeNull();
  });

  it("dismissing a special that waited past the timer lets the next one appear at once", () => {
    let s = { ...newGame("paladin", 2, cfg, T0), playerLevel: 30 };
    s = applyAction(s, { type: "TICK" }, ctx(T0 + H4));
    const old = s.specialEncounter!;
    const r = applyAction(s, { type: "DISMISS_ENCOUNTER", encounterId: old.id }, ctx(T0 + 3 * H4, 9));
    expect(r.specialEncounter).not.toBeNull();
    expect(r.specialEncounter!.id).not.toBe(old.id);
  });
});
