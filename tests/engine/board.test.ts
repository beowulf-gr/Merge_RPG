import { describe, it, expect } from "vitest";
import {
  emptyGrid,
  findEmptyCell,
  findNearestEmpty,
  canMerge,
  mergeItems,
  placeItem,
  setCell,
  swapCells,
} from "../../src/engine/board";
import { ItemId, Grid, CellContent } from "../../src/engine/types";

const item = (level: number): ItemId => ({ generator: "Gen1", chain: "ChainA", level });
const itemCell = (level: number): CellContent => ({ type: "item", item: item(level) });

describe("emptyGrid", () => {
  it("creates 80 null cells", () => {
    const g = emptyGrid();
    expect(g).toHaveLength(80);
    expect(g.every(c => c === null)).toBe(true);
  });
});

describe("findEmptyCell", () => {
  it("returns 0 on empty grid", () => {
    expect(findEmptyCell(emptyGrid())).toBe(0);
  });

  it("returns null on full grid", () => {
    let g: Grid = emptyGrid();
    for (let i = 0; i < 80; i++) {
      g = setCell(g, i, itemCell(1));
    }
    expect(findEmptyCell(g)).toBe(null);
  });
});

describe("findNearestEmpty BFS", () => {
  it("finds the same cell if it is empty", () => {
    expect(findNearestEmpty(emptyGrid(), 0)).toBe(0);
  });

  it("finds adjacent cell when origin is occupied", () => {
    let g = emptyGrid();
    g = setCell(g, 0, itemCell(1));
    const nearest = findNearestEmpty(g, 0);
    expect([1, 8]).toContain(nearest);
  });

  it("returns null when grid is full", () => {
    let g: Grid = emptyGrid();
    for (let i = 0; i < 80; i++) g = setCell(g, i, itemCell(1));
    expect(findNearestEmpty(g, 0)).toBe(null);
  });
});

describe("canMerge", () => {
  it("true for identical items below L10", () => {
    expect(canMerge(item(5), item(5))).toBe(true);
  });

  it("false for L10 items", () => {
    expect(canMerge(item(10), item(10))).toBe(false);
  });

  it("false for different generators", () => {
    expect(canMerge(item(3), { generator: "Gen2", chain: "ChainA", level: 3 })).toBe(false);
  });

  it("false for different chains", () => {
    expect(canMerge(item(3), { generator: "Gen1", chain: "ChainB", level: 3 })).toBe(false);
  });

  it("false for different levels", () => {
    expect(canMerge(item(3), item(4))).toBe(false);
  });
});

describe("mergeItems", () => {
  it("produces level+1 same gen/chain", () => {
    const result = mergeItems(item(5));
    expect(result).toEqual({ generator: "Gen1", chain: "ChainA", level: 6 });
  });
});

describe("placeItem", () => {
  it("places item in first empty cell", () => {
    const g = placeItem(emptyGrid(), item(1));
    expect(g![0]).toEqual(itemCell(1));
  });

  it("returns null when board is full", () => {
    let g: Grid = emptyGrid();
    for (let i = 0; i < 80; i++) g = setCell(g, i, itemCell(1));
    expect(placeItem(g, item(1))).toBe(null);
  });

  it("places near specified index", () => {
    let g = emptyGrid();
    g = setCell(g, 0, itemCell(1));
    const result = placeItem(g, item(2), 0);
    expect(result![0]).toEqual(itemCell(1));
    expect(result![1] ?? result![8]).toBeTruthy();
  });
});

describe("swapCells", () => {
  it("swaps two cells", () => {
    let g = emptyGrid();
    g = setCell(g, 0, itemCell(1));
    g = setCell(g, 1, itemCell(2));
    const swapped = swapCells(g, 0, 1);
    expect(swapped[0]).toEqual(itemCell(2));
    expect(swapped[1]).toEqual(itemCell(1));
  });
});
