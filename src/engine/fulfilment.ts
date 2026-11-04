import { Encounter, Grid, ItemId, itemKey } from "./types";

export interface FulfilmentPlan {
  /** Board cells to clear. */
  gridCells: number[];
  /** Inventory slots to clear. */
  inventorySlots: number[];
}

/**
 * Finds which board cells / inventory slots would be consumed to complete an
 * encounter. Board items are used before inventory items. Returns null if the
 * player doesn't hold everything required. Recipe items only ever satisfy
 * `requiredRecipe` (they never count as normal items).
 */
export function planFulfilment(
  enc: Encounter,
  grid: Grid,
  inventory: (ItemId | null)[]
): FulfilmentPlan | null {
  const usedGrid = new Set<number>();
  const usedInv = new Set<number>();

  if (enc.requiredRecipe) {
    const idx = grid.findIndex(
      c => c?.type === "recipe" && c.recipeId === enc.requiredRecipe
    );
    if (idx < 0) return null;
    usedGrid.add(idx);
  }

  for (const req of enc.requiredItems) {
    const key = itemKey(req);
    const g = grid.findIndex(
      (c, i) => !usedGrid.has(i) && c?.type === "item" && itemKey(c.item) === key
    );
    if (g >= 0) {
      usedGrid.add(g);
      continue;
    }
    const v = inventory.findIndex((it, i) => !usedInv.has(i) && it !== null && itemKey(it) === key);
    if (v >= 0) {
      usedInv.add(v);
      continue;
    }
    return null;
  }
  return { gridCells: [...usedGrid], inventorySlots: [...usedInv] };
}

/** For the UI: how many of each required item key the player currently holds (capped at need). */
export function heldCounts(
  enc: Encounter,
  grid: Grid,
  inventory: (ItemId | null)[]
): Map<string, { need: number; have: number }> {
  const out = new Map<string, { need: number; have: number }>();
  for (const req of enc.requiredItems) {
    const k = itemKey(req);
    const e = out.get(k) ?? { need: 0, have: 0 };
    e.need++;
    out.set(k, e);
  }
  for (const [k, e] of out) {
    let have = 0;
    for (const c of grid) if (c?.type === "item" && itemKey(c.item) === k) have++;
    for (const it of inventory) if (it && itemKey(it) === k) have++;
    e.have = Math.min(have, e.need);
  }
  return out;
}
