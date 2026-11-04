import { CellContent, Grid, GeneratorId, ItemId } from "./types";

export function emptyGrid(): Grid {
  return new Array<CellContent>(80).fill(null);
}

export function getCell(grid: Grid, index: number): CellContent {
  return grid[index] ?? null;
}

export function setCell(grid: Grid, index: number, content: CellContent): Grid {
  const next = grid.slice();
  next[index] = content;
  return next;
}

export function moveCell(grid: Grid, from: number, to: number): Grid {
  const next = grid.slice();
  next[to] = next[from];
  next[from] = null;
  return next;
}

export function swapCells(grid: Grid, a: number, b: number): Grid {
  const next = grid.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

export function findEmptyCell(grid: Grid): number | null {
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === null) return i;
  }
  return null;
}

export function findNearestEmpty(grid: Grid, fromIndex: number): number | null {
  const cols = 8;
  const rows = 10;
  const visited = new Set<number>();
  const queue: number[] = [fromIndex];
  visited.add(fromIndex);

  while (queue.length > 0) {
    const idx = queue.shift()!;
    if (grid[idx] === null) return idx;

    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const neighbors = [
      row > 0 ? idx - cols : -1,
      row < rows - 1 ? idx + cols : -1,
      col > 0 ? idx - 1 : -1,
      col < cols - 1 ? idx + 1 : -1,
    ];
    for (const n of neighbors) {
      if (n >= 0 && !visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return null;
}

export function canMerge(a: ItemId, b: ItemId): boolean {
  return (
    a.generator === b.generator &&
    a.chain === b.chain &&
    a.level === b.level &&
    a.level < 10
  );
}

export function mergeItems(a: ItemId): ItemId {
  return { generator: a.generator, chain: a.chain, level: a.level + 1 };
}

export function placeItem(grid: Grid, item: ItemId, preferNear?: number): Grid | null {
  const idx = preferNear !== undefined
    ? findNearestEmpty(grid, preferNear)
    : findEmptyCell(grid);
  if (idx === null) return null;
  return setCell(grid, idx, { type: "item", item });
}

export function placeGenerator(grid: Grid, genId: GeneratorId, preferNear?: number): Grid | null {
  const idx = preferNear !== undefined
    ? findNearestEmpty(grid, preferNear)
    : findEmptyCell(grid);
  if (idx === null) return null;
  return setCell(grid, idx, { type: "generator", generatorId: genId });
}

export function findItemIndex(grid: Grid, predicate: (cell: CellContent) => boolean): number | null {
  for (let i = 0; i < grid.length; i++) {
    if (predicate(grid[i])) return i;
  }
  return null;
}
