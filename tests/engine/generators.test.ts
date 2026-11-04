import { describe, it, expect } from "vitest";
import { mulberry32 } from "../../src/engine/rng";
import { loadBalance } from "../../src/engine/config";
import {
  computeCharges,
  computeMaxCharges,
  rollDrop,
  tapGenerator,
} from "../../src/engine/generators";
import { GeneratorState, UpgradeState, Grid } from "../../src/engine/types";
import { emptyGrid, setCell } from "../../src/engine/board";

const cfg = loadBalance();

function defaultUpgrades(): UpgradeState {
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

function gen1State(charges = 50): GeneratorState {
  return {
    id: "Gen1",
    charges,
    maxCharges: 50,
    lastRechargeTime: 0,
    upgradeLevel: 1,
  };
}

describe("computeMaxCharges", () => {
  it("returns base capacity with no boost", () => {
    expect(computeMaxCharges("Gen1", defaultUpgrades(), cfg)).toBe(50);
  });

  it("scales up with capacity boost tier", () => {
    const upgrades = { ...defaultUpgrades(), capacityBoost: 1 };
    const max = computeMaxCharges("Gen1", upgrades, cfg);
    expect(max).toBe(Math.floor(50 * 1.1));
  });
});

describe("computeCharges", () => {
  it("adds charges based on elapsed time", () => {
    const perCharge = cfg.generators["Gen1"].fullRechargeTimeMs / cfg.generators["Gen1"].baseCapacity;
    const gen = gen1State(0);
    const updated = computeCharges(gen, perCharge * 3, defaultUpgrades(), cfg);
    expect(updated.charges).toBe(3);
  });

  it("caps at maxCharges", () => {
    const gen = gen1State(49);
    const updated = computeCharges(gen, 900000 * 2, defaultUpgrades(), cfg);
    expect(updated.charges).toBe(50);
  });

  it("does not add partial charges", () => {
    const perCharge = cfg.generators["Gen1"].fullRechargeTimeMs / cfg.generators["Gen1"].baseCapacity;
    const gen = gen1State(0);
    const updated = computeCharges(gen, perCharge * 1.5, defaultUpgrades(), cfg);
    expect(updated.charges).toBe(1);
  });
});

describe("rollDrop", () => {
  it("returns an item with the same generator", () => {
    const rng = mulberry32(42);
    const dropped = rollDrop(gen1State(), rng, defaultUpgrades(), cfg);
    expect(dropped.generator).toBe("Gen1");
  });

  it("produces L1 items only at gen upgrade level 1", () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const dropped = rollDrop(gen1State(), rng, defaultUpgrades(), cfg);
      expect(dropped.level).toBe(1);
    }
  });

  it("chain distribution roughly matches base rates", () => {
    const rng = mulberry32(99);
    let chainA = 0, chainB = 0;
    for (let i = 0; i < 2000; i++) {
      const d = rollDrop(gen1State(), rng, defaultUpgrades(), cfg);
      if (d.chain === "ChainA") chainA++;
      else chainB++;
    }
    expect(chainA / 2000).toBeCloseTo(0.9, 1);
    expect(chainB / 2000).toBeCloseTo(0.1, 1);
  });

  it("lucky drop adds +2 or +3 levels", () => {
    const upgrades = { ...defaultUpgrades(), luckyDropChance: 4, generatorLevels: { ...defaultUpgrades().generatorLevels, Gen1: 10 } };
    const rng = mulberry32(5);
    let gotBonus = false;
    for (let i = 0; i < 500; i++) {
      const d = rollDrop(gen1State(), rng, upgrades, cfg);
      if (d.level > 4) gotBonus = true;
    }
    expect(gotBonus).toBe(true);
  });
});

describe("tapGenerator", () => {
  it("returns board_full when grid is full", () => {
    let g: Grid = emptyGrid();
    for (let i = 0; i < 80; i++) {
      g = setCell(g, i, { type: "item", item: { generator: "Gen1", chain: "ChainA", level: 1 } });
    }
    const rng = mulberry32(1);
    const result = tapGenerator(g, gen1State(), 0, rng, defaultUpgrades(), cfg);
    expect(result.feedback).toBe("board_full");
  });

  it("returns no_charges when gen has 0 charges", () => {
    const rng = mulberry32(1);
    const result = tapGenerator(emptyGrid(), gen1State(0), 0, rng, defaultUpgrades(), cfg);
    expect(result.feedback).toBe("no_charges");
  });

  it("decrements charges on success", () => {
    const rng = mulberry32(1);
    const gen = gen1State(5);
    const result = tapGenerator(emptyGrid(), gen, 0, rng, defaultUpgrades(), cfg);
    expect(result.feedback).toBe("ok");
    expect(result.gen.charges).toBe(4);
  });

  it("places item on grid", () => {
    const rng = mulberry32(1);
    const result = tapGenerator(emptyGrid(), gen1State(), 0, rng, defaultUpgrades(), cfg);
    expect(result.dropped).not.toBeNull();
    const placed = result.grid.some(c => c?.type === "item");
    expect(placed).toBe(true);
  });
});
