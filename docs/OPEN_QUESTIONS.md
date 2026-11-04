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
| OQ-7 | Deleting items | Allowed with confirmation, no reward | Provisional — confirm with Vassilis |

## Undefined / blocked

| ID | Topic | Notes |
|----|-------|-------|
| OQ-8 | Cross-chain recipe usage | GDD §9.3.1 describes crafting mechanics but usage of recipe items in encounters/rewards is not fully specified. Crafting code exists; encounter integration blocked. |
| OQ-9 | Recipe ingredient chains | GDD says "chains above are placeholders (TBC)". Current ingredients: recipe1 = Gen1_ChainA_L6 + Gen4_ChainA_L5; recipe2 = Gen3_ChainA_L8 + Gen5_ChainA_L4. Confirm with Vassilis. |
| OQ-10 | More recipes | GDD mentions "more recipes will be added". None yet. |
