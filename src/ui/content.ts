// All cosmetic lookups go through this module (CLAUDE.md §4).
import rawItems from "../../content/items.json";
import type { CellContent, GeneratorId, ItemId, PlayerClass } from "../engine";

interface GeneratorContent {
  generatorName: string;
  icon?: string;
  chains: Record<string, string[]>;
  icons?: Record<string, (string | null)[]>;
}

interface ClassContent {
  className: string;
  skillName: string;
  skillDescription: string;
  generators: Record<string, GeneratorContent>;
  recipes: Record<string, string>;
}

type ItemsFile = { ui: Record<string, string> } & Record<PlayerClass, ClassContent>;

const items = rawItems as unknown as ItemsFile;

export const CLASSES: PlayerClass[] = ["paladin", "rogue", "cleric", "wizard", "bard"];

export function classContent(cls: PlayerClass): ClassContent {
  return items[cls];
}

/** UI copy with {placeholder} substitution. Unknown keys render as the key itself. */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const raw = items.ui[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Gen0 has its own generator name but its items reuse Gen1 ChainA. */
export function getDisplay(item: ItemId, cls: PlayerClass): string {
  const gens = items[cls]?.generators;
  return gens?.[item.generator]?.chains?.[item.chain]?.[item.level - 1]
    ?? `${item.generator}_${item.chain}_L${item.level}`;
}

export function generatorName(gen: GeneratorId, cls: PlayerClass): string {
  return items[cls]?.generators?.[gen]?.generatorName ?? gen;
}

export function recipeName(recipeId: string, cls: PlayerClass): string {
  return items[cls]?.recipes?.[recipeId] ?? recipeId;
}

export function cellName(cell: CellContent, cls: PlayerClass): string {
  if (!cell) return "";
  if (cell.type === "item") return getDisplay(cell.item, cls);
  if (cell.type === "recipe") return recipeName(cell.recipeId, cls);
  return generatorName(cell.generatorId, cls);
}

export function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
