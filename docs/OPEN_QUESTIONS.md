# Open Questions

Items marked *provisional* are implemented behind config; Vassilis's confirmation needed before finalizing.

## Provisional implementations (need sign-off)

| ID | Topic | Current implementation | Status |
|----|-------|----------------------|--------|
| OQ-1 | Lucky drop split | +2 levels (75%) / +3 levels (25%) | Provisional — confirm split |
| OQ-2 | Tertiary drop boost tier 3 value | 7% for 4,000 XP | Provisional — confirm value & cost |
| OQ-3 | Secondary drop boost delta | Taken from Chain A drop rate | Provisional — confirm interaction |
| OQ-4 | Generator gating thresholds | Level 1/3/6/10/15/20 as per GDD §9.3 | Provisional — confirm thresholds |
| OQ-5 | Daily Shop reset | At local midnight | Provisional — confirm reset logic |
| OQ-6 | Class change | Allowed in Settings, cosmetic only, nothing resets | Provisional — confirm with Vassilis |
| OQ-7 | Deleting items | Not built: selling (GDD 5.3) covers removing items and always pays ≥5 Gold, so a separate "delete for nothing" action seems redundant | Confirm we can drop delete |
| OQ-11 | Special-encounter timer | Timer counts from the last spawn. If the slot is still occupied when 4 h pass, the next one spawns as soon as the slot frees. While no recipe is available, nothing spawns; one appears as soon as a recipe unlocks if 4 h have already passed | Provisional — confirm |
| OQ-12 | Dismissing a special encounter | Rerolls it in place for free (same as normal encounters), does not reset the 4 h timer | Provisional — confirm |
| OQ-13 | Which recipe a special requests | Uniform pick among available recipes | Provisional — confirm |
| OQ-14 | Early special encounters are recipe-only | At level 6 (first recipe available) the 2.5× budget is 431–1,150 XP, but recipe1 alone is worth 1,150, so no extra items are requested. Rewards are then 690 Gold / 171 XP vs. selling the recipe for 230 Gold. Extra items only appear once the budget passes the recipe value (≈ level 10+ for Deadly, ≈ level 19+ for Medium) | FYI — fine, or set a minimum number of extra items? |
| OQ-15 | UI copy | `items.json` → `ui` now holds plain-English UI strings (labels, merchant dialog text) instead of `[UI: …]` placeholders. They're functional copy, not flavour names; edit freely | FYI |

## Undefined / blocked

| ID | Topic | Notes |
|----|-------|-------|
| OQ-9 | Recipe ingredient chains | Placeholders flagged `"placeholder": true` in `balance.json`: recipe1 = Gen1_ChainA_L6 + Gen4_ChainA_L5; recipe2 = Gen3_ChainA_L8 + Gen5_ChainA_L4. Vassilis will supply real chains. |
| OQ-10 | More recipes | Vassilis will add more later. Adding one = a `balance.json` entry + a name per class in `items.json`. |

## Resolved

| ID | Topic | Resolution |
|----|-------|-----------|
| OQ-8 | Recipe usage | Special encounters (GDD 9.3.1, CLAUDE.md §6a) + selling at 100% value. Engine implemented in milestone 4; UI in milestone 10. |
