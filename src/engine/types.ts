export type GeneratorId = "Gen0" | "Gen1" | "Gen2" | "Gen3" | "Gen4" | "Gen5" | "Gen6";
export type ChainId = "ChainA" | "ChainB" | "ChainC";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Deadly";
export type PlayerClass = "paladin" | "rogue" | "cleric" | "wizard" | "bard";

export interface ItemId {
  generator: GeneratorId;
  chain: ChainId;
  level: number;
}

export type ItemKey = string;

export function itemKey(id: ItemId): ItemKey {
  return `${id.generator}_${id.chain}_L${id.level}`;
}

export function parseItemKey(key: ItemKey): ItemId {
  const m = key.match(/^(Gen\d)_(Chain[ABC])_L(\d+)$/);
  if (!m) throw new Error(`Invalid ItemKey: ${key}`);
  return {
    generator: m[1] as GeneratorId,
    chain: m[2] as ChainId,
    level: parseInt(m[3], 10),
  };
}

export type RecipeId = string;

export type CellContent =
  | { type: "item"; item: ItemId }
  | { type: "recipe"; recipeId: RecipeId }
  | { type: "generator"; generatorId: GeneratorId }
  | null;

export type Grid = CellContent[];

export interface GeneratorState {
  id: GeneratorId;
  charges: number;
  maxCharges: number;
  lastRechargeTime: number;
  upgradeLevel: number;
}

export type EncounterItem = ItemId;

export interface Encounter {
  id: string;
  difficulty: Difficulty;
  requiredItems: EncounterItem[];
  /** Special encounters only: the recipe item that must be handed in. */
  requiredRecipe?: RecipeId;
  /** Base rewards. The Gold multiplier upgrade is applied at completion time. */
  rewards: { gold: number; xp: number };
  isSpecial: boolean;
  createdAt: number;
}

export interface UpgradeState {
  generatorLevels: Record<GeneratorId, number>;
  secondaryDropBoost: number;
  tertiaryDropBoost: number;
  luckyDropChance: number;
  goldMultiplier: number;
  encounterSlots: number;
  skillCooldownReduction: number;
  generatorCooldownReduction: number;
  inventorySlots: number;
  mergeCritChance: number;
  capacityBoost: number;
}

export interface GameState {
  grid: Grid;
  generators: Record<GeneratorId, GeneratorState>;
  encounters: Encounter[];
  /** Dedicated special-encounter slot (GDD 9.3.1). At most one waiting. */
  specialEncounter: Encounter | null;
  inventory: (ItemId | null)[];
  gold: number;
  xp: number;
  playerLevel: number;
  playerClass: PlayerClass | null;
  upgrades: UpgradeState;
  skillCooldownEndsAt: number;
  lastSpecialEncounterAt: number;
  dailyShopResetAt: number;
  rngSeed: number;
  /** Current PRNG state, advanced by every action so play is reproducible. */
  rngState: number;
  /** Counter for deterministic encounter ids. */
  nextEncounterId: number;
}
