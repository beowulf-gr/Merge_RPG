import { CellContent } from "./types";
import { BalanceConfig } from "./config";
import { crXpMapFrom, getRecipe, recipeValue, rewardGold } from "./encounters";

/**
 * Gold a merchant pays for a cell's content (GDD 5.3), or null if it can't be sold.
 * - Normal item: floor(normalItemFraction × max(10, CR_XP / 5))  → L1 = 5, L4 = 20, L8 = 180
 * - Recipe item: floor(recipeItemFraction × max(10, value / 5))  → 1,150 value = 230
 * - Generators and empty cells: not sellable.
 * The Gold multiplier upgrade never applies to selling.
 */
export function sellPrice(cell: CellContent, cfg: BalanceConfig): number | null {
  if (!cell) return null;
  if (cell.type === "item") {
    const cr = crXpMapFrom(cfg)[cell.item.level];
    return Math.floor(cfg.selling.normalItemFraction * rewardGold(cr));
  }
  if (cell.type === "recipe") {
    const recipe = getRecipe(cell.recipeId, cfg);
    if (!recipe) return null;
    return Math.floor(cfg.selling.recipeItemFraction * rewardGold(recipeValue(recipe, cfg)));
  }
  return null;
}
