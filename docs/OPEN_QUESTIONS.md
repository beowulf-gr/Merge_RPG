# Open Questions

Items marked *provisional* are implemented behind config; Vassilis's confirmation needed before finalizing.

## Provisional implementations (need sign-off)

| ID | Topic | Current implementation | Status |
|----|-------|----------------------|--------|
| OQ-3 | Secondary drop boost delta | Taken from Chain A drop rate | Provisional — confirm interaction |
| OQ-4 | Generator gating thresholds | Level 1/3/6/10/15/20 as per GDD §9.3 | Provisional — confirm thresholds |
| OQ-13 | Which recipe a special requests | Uniform pick among available recipes | Provisional — confirm |
| OQ-15 | UI copy | `items.json` → `ui` holds plain-English UI strings (labels, merchant dialog text) instead of `[UI: …]` placeholders. They're functional copy, not flavour names; edit freely | FYI |

## Undefined / blocked

| ID | Topic | Notes |
|----|-------|-------|
| OQ-9 | Recipe ingredient chains | Placeholders flagged `"placeholder": true` in `balance.json`: recipe1 = Gen1_ChainA_L6 + Gen4_ChainA_L5; recipe2 = Gen3_ChainA_L8 + Gen5_ChainA_L4. Vassilis will supply real chains. |
| OQ-10 | More recipes | Vassilis will add more later. Adding one = a `balance.json` entry + a name per class in `items.json`. |

## Resolved

| ID | Topic | Resolution |
|----|-------|-----------|
| OQ-1 | Lucky drop split | Decided: +2 levels (75%) / +3 levels (25%). |
| OQ-2 | Tertiary drop boost | Decided: 3% / 5% / 7% for 500 / 1,500 / 4,000 XP. |
| OQ-5 | Daily Shop | Decided: 6 offers of L1/L2 items from unlocked chains, once per day each, reset at local midnight. |
| OQ-6 | Class change | Allowed in Settings, cosmetic only, nothing resets; must show a strong warning that all names/visuals will change. |
| OQ-7 | Deleting items | Dropped. Selling replaces it. |
| OQ-8 | Recipe usage | Special encounters (GDD 9.3.1, CLAUDE.md §6a) + selling at 100% value. Engine implemented in milestone 4; UI in milestone 10. |
| OQ-11 | Special-encounter timer | Counts from the last appearance; at most one waiting; while no recipe is available nothing spawns, and one appears as soon as a recipe unlocks if 4 h have passed. |
| OQ-12 | Dismissing a special encounter | Only empties the slot; no free replacement. The next one follows the 4 h timer. |
| OQ-14 | Early recipe-only specials | Intended: at low levels the recipe alone exceeds the 2.5× budget, so the special asks only for the recipe and pays 3× its sell price. |
| OQ-16 | Inventory base slots | 5 base + up to 10 purchasable = 15 (GDD 5.1/9.4). |
| OQ-17 | Playwright | Approved as a dev dependency; add at milestone 9. |
