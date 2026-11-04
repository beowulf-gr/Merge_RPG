# CLAUDE.md — Merge RPG

Guidance for Claude Code working in this repository.

## What this is

A **Merge-2 puzzle game with a D&D/fantasy RPG skin**. The player taps generators to spawn items on an 8×10 grid, merges identical items up to Level 10, fulfils procedurally generated **encounters** (the Order Board) for Gold and XP, spends XP on permanent meta-upgrades and Gold on cosmetic castle restoration.

**Core philosophy (non-negotiable):** no energy limits, no ads, no real-money purchases, no predatory mechanics. "XP (Premium Currency)" in the GDD only means XP is the scarce currency. It is never sold.

### Source documents (in this folder)

| File | Role |
|---|---|
| `Merge RPG Game Design Document.docx` | **Source of truth** for design. Owned by Vassilis. |
| `docs/GDD.md` | Markdown export of the docx for easy reading. If the docx is newer, regenerate (`pandoc "Merge RPG Game Design Document.docx" -t gfm -o docs/GDD.md`) or ask. |
| `enounter_generator.py` | Reference encounter generator (filename typo is original, leave it). Port to TypeScript, see §5. Do not delete. |

Read `docs/GDD.md` in full before starting. This file records the **decisions that override or fill gaps in the GDD** (§6). Where they conflict, this file wins. Where neither covers something, ask instead of inventing a mechanic.

## 1. Tech stack

- **TypeScript (strict)**, **Vite**, **React 18** for all UI.
- **Zustand** (or similar small store) for app state that wraps the engine.
- **Vitest** for unit tests. Use **Playwright** for a few smoke/e2e tests once the UI exists.
- Board rendered with DOM/CSS grid + pointer events (drag and drop that works with both mouse and touch). Animations via CSS transitions or Framer Motion. No canvas engine unless performance demands it. 80 cells is fine in DOM.
- Fonts: **Cinzel** (headings) + **Inter** (body), matching the GDD.
- Persistence: **local only** (IndexedDB via `idb-keyval`, or localStorage), no backend.
- Target: responsive web first (desktop + mobile browsers, portrait-first layout). Later: PWA manifest + service worker. Capacitor wrap is a possible later step, so don't block it.
- Keep dependencies minimal. Ask before adding anything heavy.

The parent folder is named "Unity Projects" for historical reasons. This is **not** a Unity project.

## 2. Architecture: strict logic/presentation split (GDD §10)

```
src/
  engine/        # Pure TS. NO React, NO DOM, NO cosmetic strings, NO Date.now()/Math.random() directly
    rng.ts         # seedable PRNG (e.g. mulberry32); all randomness goes through it
    clock.ts       # injected time source (ms); engine never reads wall time itself
    types.ts       # ItemId {generator, chain, level}, GameState, etc.
    board.ts       # grid ops: place, move, swap, merge, crafting
    generators.ts  # charges, continuous recharge, drop rolls (chain → level → lucky)
    encounters.ts  # TS port of enounter_generator.py + weighting/gating
    upgrades.ts    # XP meta-upgrades, player level
    skills.ts      # class skills + cooldowns
    castle.ts      # gold sink
    shop.ts        # daily shop
    save.ts        # serialize/deserialize + versioned migrations
    index.ts       # public engine API: pure functions / reducer style (state, action, ctx) => state
  config/
    balance.json   # ALL economy numbers (drop tables, costs, cooldowns, thresholds)
  content/
    items.json     # ALL cosmetic data per class (names, icons, flavour), placeholders, see §4
  ui/              # React components; reads engine state, renders via items.json lookup
  store/           # zustand store bridging engine ↔ UI, persistence, tick loop
tests/
scripts/
  simulate.ts    # headless balance simulation (see §7)
```

Rules:
- The engine works only with raw IDs like `{ generator: "Gen1", chain: "ChainA", level: 4 }` (string key `Gen1_ChainA_L4`). The class is a presentation concern. **The engine must never branch on the player's class for economy.** The only class-dependent engine code is *which class skill* the player has.
- Every number from the GDD lives in `config/balance.json`, never hardcoded. The engine reads config through a typed loader with validation (e.g. drop tables sum to 100%).
- Engine functions are deterministic given (state, action, rng seed, now). That is what makes them testable and makes offline progress work.

## 3. Game rules summary (see GDD for full tables)

- **Grid:** 8 columns × 10 rows. Generators occupy grid cells and can be moved like items.
- **Generators:** Gen1–Gen6 with chains/drop rates, base capacity and full-recharge times per GDD §4.1. **Gen0 (Scavenger)** unlocks at Player Level 20: infinite charges, no cooldown, always drops `Gen1_ChainA_L1`, not upgradeable.
- **Drop roll order per tap:** (1) pick chain by the generator's chain weights (after drop-boost upgrades) → (2) pick level from the generator's upgrade-level table (GDD §4.2) → (3) lucky-drop roll may add +2/+3 → clamp to 10.
- **Merge:** two identical IDs → one item of level+1. L10 + L10 does nothing (items swap). Non-identical drop = swap positions. **Merge Critical** upgrade: chance to produce two result items (second one goes to nearest empty cell; if none, only one).
- **Encounters:** see §5.
- **Currencies:** Gold (castle only), XP (all meta-upgrades, inventory, daily shop).
- **Player Level:** starts at 1, +1 per XP meta-upgrade tier purchased (generator levels, all §5.1/§9.4 upgrade tiers, inventory slots). Daily Shop purchases and castle upgrades do **not** count. Max 100: 54 generator levels + 3 secondary + 3 tertiary + 4 lucky + 4 gold mult + 4 slots + 3 skill CD + 3 gen CD + 10 inventory + 6 crit + 6 capacity = 100. Add a test asserting the max reachable level is exactly 100.
- **Class skills** (1h base cooldown, reducible): Paladin Taunt, Rogue Execute, Cleric Revitalize, Wizard Time Warp, Bard Buff (details in §6).
- **Castle:** 4 tiers × 5 upgrades, Gold costs in GDD §9.5.

## 4. Cosmetic content: `content/items.json`

Vassilis will fill in all names by hand. Claude Code generates the **complete placeholder structure** and never invents flavour names.

- One entry per class: `paladin`, `rogue`, `cleric`, `wizard`, `bard`.
- Per class: class display name, skill name + description, generator names for **Gen0–Gen6**, every chain's 10 item names, recipe names, and optional `icon` paths.
- Placeholder values are readable and unique, e.g. `"[Paladin Gen1 ChainA L4]"`, `"[Paladin Gen2 Name]"`. Keep the GDD's one known name: Gen6 = "Wondrous Items" for every class.
- Gen0 has its own generator name per class, but its items reuse Gen1 ChainA entries (no orphan chain).
- Also include a top-level `ui` strings block so all UI copy lives in data, ready for localisation later.
- Ship a JSON Schema (`content/items.schema.json`) and a test that validates items.json: every class has every Gen/Chain/Level key that `balance.json` defines, and nothing extra.
- **Missing icon fallback:** render a tile coloured by generator, showing chain letter + level number. This is the default look until art exists.
- The UI resolves display names as `items[class].generators[Gen].chains[Chain][level-1]`. Encounters, the board and the shop all go through one `getDisplay(itemId, class)` helper.

## 5. Encounters (Order Board)

Port `enounter_generator.py` to `src/engine/encounters.ts` **keeping its maths identical** (XP budget `50 + level*30`, difficulty weights 20/40/30/10, multipliers, `CR_XP_MAP`, `max_item_level = min(10, level//5 + 2)`, min-item calculation, random level bumping, rewards `gold = max(10, xp/5)`, `xp = max(2, xp/20)`). All constants move to `balance.json`.

**Change from the script (decided):** the script picks generator and chain uniformly. Replace that with **weighted + level-gated** selection:

1. Only **unlocked** generators/chains can be requested (gating below).
2. Weight of each (generator, chain) = `generatorRequestWeight[gen] × chainDropRate[gen][chain]`, with a configurable floor `minChainRequestWeight` so rare chains still appear occasionally. Use the player's *current* drop rates (after boosts).
3. Keep a `mode: "uniform"` option that reproduces the original script's behaviour, and a parity test running the Python and TS versions' deterministic parts (`get_minimum_items_required`, level distribution logic) on the same inputs.

**Default gating (tunable in balance.json, flag to Vassilis as provisional):**

| Player Level | Unlocks |
|---|---|
| 1 | Gen1 (A, B), Gen2 (A, B) |
| 3 | Gen3 |
| 6 | Gen4 |
| 10 | Gen5, Gen2 Chain C becomes requestable |
| 15 | Gen6 |
| 20 | Gen0 Scavenger (produces Gen1 ChainA items, so adds no new request type) |

Generators that are not yet unlocked do not appear on the board. When one unlocks, it's placed in the nearest free cell (or queued until a cell frees up, with a UI notice).

Other encounter rules:
- Base encounter slots: **3**, upgradable to 7. A new encounter is generated whenever a slot opens.
- Fulfilment: when all required items exist on the board (or in inventory), the encounter shows a "Complete" button. Tapping it removes those items and grants rewards. Gold multiplier upgrade applies to Gold only.
- Player may **dismiss** an encounter for free (it's regenerated). No-energy philosophy.

## 6. Decisions filling gaps / resolving conflicts in the GDD

Where §5.1 and §9.4 of the GDD disagree, **§9.4 (the cost tables) wins** unless stated here.

| Topic | Decision |
|---|---|
| Gold multiplier tiers | 1.25× / 1.5× / 1.75× / 2.0× (per §9.4) |
| Secondary drop boost | Chain B rate becomes 12% / 15% / 20% for 10%-base gens; for Gen2 (9% base) apply the same deltas (+2/+5/+10 → 11/14/19%). Taken from Chain A. |
| Tertiary drop boost | **3 tiers** (decided): Gen2 Chain C 3% (500 XP) / 5% (1,500 XP) / 7% (4,000 XP). Third tier's value and cost are provisional. Taken from Chain A. |
| Lucky drop | Base 0%. On success: +2 levels (75%) or +3 levels (25%), clamp to 10. Split is provisional. |
| Generator recharge | Continuous: one charge every `fullRechargeTime / baseCapacity` (Gen1 = 18s). Capacity upgrades raise the cap but keep the same per-charge interval. Cooldown reduction shortens the interval. |
| Offline progress | On load, advance all timers by elapsed real time (charges, skill cooldown, daily shop reset). Clamp negative/huge clock jumps sensibly. |
| Tap with full board | Nothing spawns and no charge is consumed. Show feedback. |
| Spawn position | Nearest empty cell to the generator (BFS). |
| Generator upgrade costs | Same table (§9.4) for every generator. |
| Inventory | Starts at 0 slots; up to 10 purchasable. Items in inventory count for encounter fulfilment. |
| Deleting items | Allowed with confirmation, no reward. (GDD silent, confirm with Vassilis.) |
| Paladin Taunt | Adds 5 extra encounters above the slot cap; they stay until completed or dismissed and are not replaced. |
| Rogue Execute | Player picks one active encounter; it completes with full rewards, no items consumed. |
| Cleric Revitalize | All generators instantly refill to max charges. |
| Wizard Time Warp | Advances all generator recharge by 4 hours (does not affect skill cooldown or shop). |
| Bard Buff | Player selects up to 10 items (not generators, not L10, not recipe items); each gains +1 level. |
| Class choice | Picked at first launch; can be changed later in Settings (cosmetic only, nothing resets). Confirm with Vassilis. |
| Daily Shop | 6 offers of random L1/L2 items from unlocked chains, each buyable once per day, resets at local midnight. Provisional. |
| Castle | Upgrades within a tier bought in listed order; tier N+1 unlocks when tier N is complete. Needs a castle screen showing progress (placeholder art). |
| Cross-chain recipes | See §6a. |
| Selling items | Any board item can be sold to a merchant with a confirm dialog (GDD 5.3). Normal items: `floor(0.5 × max(10, CR_XP/5))` (L1 = 5, L4 = 20, L8 = 180). Recipe items: 100% of their value. Generators can't be sold. Gold multiplier does not apply. Fractions in `balance.json` → `selling`. |
| Save data | Versioned schema with migrations; autosave on every action (debounced). Add export/import save as JSON in Settings. |

## 6a. Recipes and special encounters (GDD 9.3.1)

- **Crafting:** drag one ingredient onto the other (either direction, exact generator/chain/level) → both are consumed and a recipe item appears in the target cell. Recipe items can't be merged, buffed by the Bard, or used in normal encounters.
- **Ingredients** live in `balance.json` → `recipes`, identical for all classes (names per class in `items.json`). Current ingredient chains are placeholders and stay flagged `"placeholder": true` until Vassilis supplies the real ones and more recipes.
- **Recipe value** = sum of the ingredients' CR XP (L6 + L5 = 700 + 450 = 1,150). Sell price = `max(10, value/5)` Gold (100%).
- **Special encounters:** one every 4 h of real time (also offline), at most one waiting, in their own dedicated slot. Difficulty rolled as normal, XP budget = 2.5 × normal. One available recipe item is required (its value counts toward the budget); normal items fill the rest. Rewards = 3 × the normal formula (Gold multiplier still applies to Gold).
- **Availability:** a recipe is available once all its ingredients' generators/chains are unlocked. If none is, no special encounter spawns.
- Engine side is done (milestone 4). The special-encounter UI is milestone 10.

Anything marked *provisional* or *ask*: implement it behind config, list it in `docs/OPEN_QUESTIONS.md`, and keep going.

## 7. Balance tooling

- `scripts/simulate.ts`: headless run of the engine with a simple bot (taps, greedy merges, completes encounters, buys cheapest useful upgrade). Report time-to-level curve, Gold/XP income per hour and encounter completion rate. Run with `npm run simulate`.
- Use it to sanity-check that early levels feel achievable (e.g. first generator upgrade within the first ~15 min of play). Report findings; don't silently retune numbers. Balance changes are Vassilis's call.

## 8. Milestones (build in this order, each playable/testable)

1. **Scaffold:** Vite + React + TS + Vitest + lint/format. `balance.json` with all GDD numbers, typed loader + validation tests. `items.json` placeholders + schema test.
2. **Engine core:** RNG/clock, board, generators (drops, recharge), merge, merge-crit. Full unit tests.
3. **Encounters:** TS port + weighting + gating, rewards, slots. Parity and distribution tests.
4. **Playable board UI:** grid, drag/drop (touch + mouse), generator taps, order board, currency HUD, class selection screen, sell-to-merchant dialog. Fallback tiles. Recipe crafting + special-encounter engine.
5. **Progression:** XP upgrade screen (all §9.4 sinks), player level, inventory, daily shop, Gen0 unlock.
6. **Class skills** with cooldowns + UI (incl. Bard multi-select).
7. **Castle** gold sink screen.
8. **Persistence + offline progress**, settings (class change, export/import, reset).
9. **Polish:** animations, sounds hooks, responsive/mobile pass, PWA manifest.
10. Special-encounter UI (engine already implemented, see §6a).

## 9. Commands

Keep these working and up to date in `package.json`:

```
npm install
npm run dev        # local dev server
npm run build      # production build
npm test           # vitest
npm run simulate   # balance simulation
npm run lint
```

## 10. Working conventions

- The user (Vassilis) is a product manager with a data background: comfortable with specs and numbers, not a full-time developer. Explain trade-offs briefly and plainly; keep summaries short.
- Write tests alongside engine code; engine coverage should stay high. UI tests can be lighter.
- Never hardcode cosmetic strings or economy numbers outside `items.json` / `balance.json`.
- Don't change GDD maths without asking. If something in the GDD looks broken (e.g. an impossible encounter), surface it with numbers.
- Keep `docs/OPEN_QUESTIONS.md` current; keep a short `docs/CHANGELOG.md` per milestone.
- Commit in small, milestone-scoped commits if git is initialised (run `git init` at milestone 1).
