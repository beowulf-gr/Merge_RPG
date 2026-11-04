# Changelog

## Milestone 4 — Playable board UI + recipes/selling engine

UI
- Class selection screen; HUD (Gold, XP, Level); order board with per-item progress, Complete/Dismiss
- 8×10 board with pointer-event drag & drop (mouse + touch), tap generators to spawn, selection panel with live charge countdown
- Sell-to-merchant confirm dialog; toasts for board full / no charges / crits / crafting / sales
- Fallback tiles coloured by generator showing chain letter + level; recipe tiles in gold
- `src/ui/content.ts`: all names via `getDisplay` / `items.json`; `src/store/gameStore.ts` (zustand) bridges engine ↔ UI with a 1 s tick

Engine
- Recipes: crafting by dropping one ingredient on the other; recipe items are terminal (`{type: "recipe"}` cells)
- Special encounters: every 4 h from the last appearance, own slot, 2.5× budget, recipe required, 3× rewards, gated on recipe availability; dismissing only empties the slot
- Selling: `sellPrice` + `SELL_ITEM` (50% normal / 100% recipe, generators unsellable)
- New `step()` returns `{state, events}`; `DROP_ITEM` handles move/merge/craft/swap
- RNG state persisted in `GameState.rngState`; deterministic encounter ids

Fixes to milestone 2/3 code
- Encounter completion now checks and consumes the required items (board, then inventory)
- Gold multiplier applied at completion, not baked in at generation
- Merge-crit no longer fires on generator taps
- A generator that sat full no longer refills instantly after the next tap
- `CR_XP_MAP` read from `balance.json`; recipe validation added to `validateBalance`

## Milestone 3 — Encounters engine

- Ported `enounter_generator.py` to `src/engine/encounters.ts` with identical maths
- Added weighted + level-gated generator/chain selection (mode: "weighted")
- Kept `mode: "uniform"` option for parity testing
- Added `getUnlockedGeneratorsAndChains` using gating table from `balance.json`
- Added `computeCurrentDropRates` applying secondary/tertiary boost upgrades
- Wired encounter generation into engine index (complete/dismiss actions)
- Tests: parity (getMinimumItemsRequired), difficulty distribution (1000 samples), level cap, gating

## Milestone 2 — Engine core

- `src/engine/rng.ts`: mulberry32 seedable PRNG, weightedChoice, pickOne
- `src/engine/clock.ts`: injected Clock type + wallClock
- `src/engine/types.ts`: ItemId, ItemKey, CellContent, Grid, GeneratorState, Encounter, UpgradeState, GameState
- `src/engine/board.ts`: emptyGrid, findEmptyCell, findNearestEmpty (BFS), canMerge, mergeItems, placeItem, swapCells
- `src/engine/generators.ts`: computeCharges, computeMaxCharges, rollDrop (chain+level+lucky), tapGenerator
- `src/engine/config.ts`: typed balance loader + validateBalance
- `src/engine/index.ts`: applyAction reducer, newGame, tickTime, getDisplay
- Tests: rng determinism/distribution, board ops, generator charges/drops/tap edge cases

## Milestone 1 — Scaffold

- Vite + React 18 + TypeScript strict project
- Vitest, ESLint, Prettier, Zustand
- `config/balance.json`: all economy numbers from GDD §4–§9
- `content/items.json`: placeholder structure for all 5 classes (Gen0–Gen6, all chains, all 10 levels)
- `content/items.schema.json`: JSON Schema for items.json validation
- Tests: balance loader validation, drop table sums, max player level = 100, items.json schema
