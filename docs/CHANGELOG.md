# Changelog

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
