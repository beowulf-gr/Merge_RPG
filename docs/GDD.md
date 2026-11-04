# 1. Project Overview

- **Genre:** Merge-2 Puzzle Game / RPG

- **Theme:** Dungeons & Dragons / Fantasy TTRPG

- **Platform:** Cross-platform (Browser and Mobile responsive)

- **Core Philosophy:** No energy limits, no predatory monetization, zero
  > ads.

- **Class System (Cosmetic):** Players choose an RPG class (Paladin,
  > Rogue, Cleric, Wizard, Bard) at the start. This choice reskins all
  > generators, items, and encounters to fit the theme, but the
  > underlying economy, drop weights, and requirements remain strictly
  > identical across all classes.

# 2. Core Gameplay Loop

1.  **Choose a Class** (Paladin, Rogue, Cleric, Wizard, or Bard).

2.  **Tap Generators** to spawn base items.

3.  **Merge Items** on the 8x10 grid (Items scale up to Level 10).

4.  **Craft Cross-Chain Items** (Recipes) for specialized terminal
    > items.

5.  **Defeat Encounters** (the "Order Board") by submitting requested
    > items.

6.  **Use Class Skill** (1-hour cooldown) to manipulate the board.

7.  **Level Up** by spending XP on permanent meta-upgrades.

# 3. Class Skills (1-Hour Cooldown)

Each class has a unique active ability to manipulate the game state:

- **Paladin ("Taunt"):** Summons 5 extra encounters above the normal
  > maximum limit.

- **Rogue ("Execute"):** Instantly completes 1 active encounter without
  > spending the required items.

- **Cleric ("Revitalize"):** Instantly resets the cooldown timers of all
  > generators on the board.

- **Wizard ("Time Warp"):** Skips the next 4 hours of
  > generation/cooldown time.

- **Bard ("Buff"):** Increases the level of up to 10 selected items on
  > the board by 1.

# 4. Generator Architecture (The Math)

There are 6 distinct generators. The underlying drop weights and
mechanics are identical for all classes.

## 4.1. Generator Chains, Cooldowns & Base Capacity

Instead of triggering a timer only when empty, generators utilize a
**Continuous Recharge** system. Each generator regenerates individual
charges steadily in the background up to its maximum base capacity,
ensuring active players constantly have new taps available while
managing their board.

To guarantee the game truly has no energy limits, players also have
access to a permanent infinite generator.

- **Gen 0 (The Scavenger - Infinite):** Unlocked when the player reaches
  > Level 20. Features 0 cooldown and infinite charges, dropping 100%
  > Level 1 items corresponding directly to Gen 1 - Chain A. Cannot be
  > upgraded with XP (does not affect Player Level max calculations).
  > Ensures players can always make progress at higher levels without
  > introducing an orphaned asset chain.

- **Gen 1 (High-Freq - 15m full recharge):** Base 50 charges. Chain A
  > (90%), Chain B (10%). Max Item Level 10.

- **Gen 2 (High-Freq - 15m full recharge):** Base 50 charges. Chain A
  > (90%), Chain B (9%), Chain C (1%). Max Item Level 10.

- **Gen 3 (Mid-Freq - 45m full recharge):** Base 30 charges. Chain A
  > (100%). Max Item Level 10.

- **Gen 4 (Mid-Freq - 45m full recharge):** Base 30 charges. Chain A
  > (90%), Chain B (10%). Max Item Level 10.

- **Gen 5 (Long-Cycle - 2h full recharge):** Base 20 charges. Chain A
  > (90%), Chain B (10%). Max Item Level 10.

- **Gen 6 (Long-Cycle - 3h full recharge):** Base 15 charges. Chain A
  > (100%). Max Item Level 10.

## 4.2. Generator Upgrades & Drop Levels

Generators can be permanently upgraded from Level 1 to Level 10 using
XP. This adds a layer of randomization to the level of the item dropped
(applied *after* the chain is selected).

*(Note: Level 4 was adjusted to 60/40 to equal 100%)*

- **Level 1:** 100% Level 1 item

- **Level 2:** 90% Level 1, 10% Level 2

- **Level 3:** 80% Level 1, 20% Level 2

- **Level 4:** 60% Level 1, 40% Level 2

- **Level 5:** 50% Level 1, 50% Level 2

- **Level 6:** 45% Level 1, 50% Level 2, 5% Level 3

- **Level 7:** 43% Level 1, 47% Level 2, 10% Level 3

- **Level 8:** 40% Level 1, 45% Level 2, 15% Level 3

- **Level 9:** 40% Level 1, 40% Level 2, 20% Level 3

- **Level 10:** 35% Level 1, 40% Level 2, 23% Level 3, 2% Level 4

## 4.3. Lucky Drops

Every tap has a chance (base 0%, raised via the Lucky Drop XP upgrade)
to spawn an item higher than what the generator's drop level table
rolled: +2 levels (75% of lucky drops) or +3 levels (25%), capped at
Level 10.

# 5. Economy & Progression

- **Player Level:** The player starts at Level 1 and gains +1 Level for
  > every permanent generator upgrade or XP meta-upgrade purchased.
  > Cosmetic Castle upgrades cost Gold and do not impact Player Level,
  > ensuring the game's difficulty scales strictly in lockstep with
  > mechanical power. (Max Level: 100).

- **Gold:** Earned quickly from encounters. Used exclusively for the
  > Castle restoration and upgrade meta-game.

- **XP (Premium Currency):** Earned from encounters. Used for all
  > permanent meta-upgrades, inventory expansion, and purchasing base
  > items.

## 5.1. XP Sinks (Meta-Upgrades & Utility)

8.  **Generator Level Upgrades:** Upgrade individual generators from
    > Level 1 to 10 to improve the baseline drop levels.

9.  **Secondary Drop Rate Boost:** Base -\> +2% -\> +5% -\> +10%

10. **Tertiary Drop Rate Boost:** Base (1%) -\> 3% -\> 5% -\> 7%

11. **Lucky Drop Chance:** Base -\> +2% -\> +4% -\> +8% -\> +15%

12. **Gold Multipliers on Encounters:** 1.25x -\> 1.5x -\> 1.75x -\>
    > 2.0x

13. **Encounter Slots:** Base 3 slots -\> Slot 4 -\> Slot 5 -\> Slot 6
    > -\> Slot 7

14. **Class Skill Cooldown Reduction:** 60m -\> 50m -\> 40m -\> 30m

15. **Generator Cooldown Reduction:** -5% -\> -10% -\> -20% overall time

16. **Inventory Expansion:** 5 permanent storage slots outside the main
    > 8x10 grid from the start; purchase up to 10 more (15 total). Items
    > in inventory count towards encounters.

17. **Daily Shop:** Purchase base Level 1 or 2 items directly using XP
    > instead of relying on generator drops.

18. **Merge Critical Success:** Base -\> 1% -\> 2% -\> 3% -\> 4% -\> 5%
    > -\> 6% chance when merging two items to instantly gain two items
    > of the same level instead of one.

19. **Generator Charge Capacity:** Base -\> +10% -\> +20% -\> +30% -\>
    > +50% -\> +75% -\> +100% maximum stored taps before triggering a
    > cooldown.

## 5.2. The Castle (Gold Sink)

Players are gifted a ruined castle and surrounding plot of land by the
local monarch. Gold earned from encounters is used to clear debris,
repair structures, and eventually construct luxury and magical upgrades.
This acts as the game's endless cosmetic progression track.

- **Tier 1 (Restoration):** Clearing rubble, patching curtain walls,
  > rebuilding the basic barracks and wooden gates.

- **Tier 2 (Expansion):** Constructing the Royal Stables, the
  > blacksmith's forge, and the marketplace.

- **Tier 3 (Luxury):** Upgrading to a luxury throne room, marble
  > courtyards, and grand feasting halls.

- **Tier 4 (Magical Defenses):** Installing arcane wards, floating
  > towers, and enchanted moats.

## 5.3. Selling Items

Any item on the board can be sold to a merchant for Gold (with a
confirmation prompt). Generators cannot be sold.

- **Normal items:** 50% of the Gold an encounter requiring only that
  > item would pay: max(10, CR XP / 5) × 50%. Examples: L1 = 5 Gold, L4
  > = 20 Gold, L8 = 180 Gold.

- **Recipe items:** 100% of their value (see 9.3.1).

- **Note:** The Gold Multiplier upgrade does not apply to selling,
  > keeping encounters the main Gold source.

# 6. Cosmetic Skins (The 5 Roles)

The underlying economy requires exact alignment. Complete the
placeholders \`\[L1\]\`, \`\[L2\]\`, etc., for all 10 levels of each
chain, for every role.

## 6.1. CLASS: PALADIN

**Generators & Item Chains:**

- **Generator 1:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 2:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (9%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain C (1%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 3:** \[Gen Name\]

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 4:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 5:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 6:** Wondrous Items

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

**Cross-Chain Recipes:**

- \[Recipe 1 Name\]: Req (Gen1_ChainA_L6 + Gen4_ChainA_L5)

- \[Recipe 2 Name\]: Req (Gen3_ChainA_L8 + Gen5_ChainA_L4)

- Chains above are placeholders (TBC). More recipes will be added; every
  > ingredient must name its generator, chain and level. Ingredients are
  > identical for all classes; only names differ. Usage: see 9.3.1.

**Encounters:**

- **Endless Dynamic Generation:** Encounters are not a static list. They
  > are procedurally generated on the fly based on the Player's Level,
  > utilizing a 20/40/30/10 (Easy/Medium/Hard/Deadly) difficulty
  > distribution.

## 6.2. CLASS: ROGUE

**Generators & Item Chains:**

- **Generator 1:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 2:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (9%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain C (1%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 3:** \[Gen Name\]

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 4:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 5:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 6:** Wondrous Items

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

**Cross-Chain Recipes:**

- \[Recipe 1 Name\]: Req (Gen1_ChainA_L6 + Gen4_ChainA_L5)

- \[Recipe 2 Name\]: Req (Gen3_ChainA_L8 + Gen5_ChainA_L4)

- Chains above are placeholders (TBC). More recipes will be added; every
  > ingredient must name its generator, chain and level. Ingredients are
  > identical for all classes; only names differ. Usage: see 9.3.1.

**Encounters:**

- **Endless Dynamic Generation:** Encounters are not a static list. They
  > are procedurally generated on the fly based on the Player's Level,
  > utilizing a 20/40/30/10 (Easy/Medium/Hard/Deadly) difficulty
  > distribution.

## 6.3. CLASS: CLERIC

**Generators & Item Chains:**

- **Generator 1:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 2:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (9%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain C (1%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 3:** \[Gen Name\]

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 4:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 5:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 6:** Wondrous Items

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

**Cross-Chain Recipes:**

- \[Recipe 1 Name\]: Req (Gen1_ChainA_L6 + Gen4_ChainA_L5)

- \[Recipe 2 Name\]: Req (Gen3_ChainA_L8 + Gen5_ChainA_L4)

- Chains above are placeholders (TBC). More recipes will be added; every
  > ingredient must name its generator, chain and level. Ingredients are
  > identical for all classes; only names differ. Usage: see 9.3.1.

**Encounters:**

- **Endless Dynamic Generation:** Encounters are not a static list. They
  > are procedurally generated on the fly based on the Player's Level,
  > utilizing a 20/40/30/10 (Easy/Medium/Hard/Deadly) difficulty
  > distribution.

## 6.4. CLASS: WIZARD

**Generators & Item Chains:**

- **Generator 1:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 2:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (9%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain C (1%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 3:** \[Gen Name\]

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 4:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 5:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 6:** Wondrous Items

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

**Cross-Chain Recipes:**

- \[Recipe 1 Name\]: Req (Gen1_ChainA_L6 + Gen4_ChainA_L5)

- \[Recipe 2 Name\]: Req (Gen3_ChainA_L8 + Gen5_ChainA_L4)

- Chains above are placeholders (TBC). More recipes will be added; every
  > ingredient must name its generator, chain and level. Ingredients are
  > identical for all classes; only names differ. Usage: see 9.3.1.

**Encounters:**

- **Endless Dynamic Generation:** Encounters are not a static list. They
  > are procedurally generated on the fly based on the Player's Level,
  > utilizing a 20/40/30/10 (Easy/Medium/Hard/Deadly) difficulty
  > distribution.

## 6.5. CLASS: BARD

**Generators & Item Chains:**

- **Generator 1:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 2:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (9%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain C (1%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 3:** \[Gen Name\]

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 4:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 5:** \[Gen Name\]

  - Chain A (90%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

  - Chain B (10%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

- **Generator 6:** Wondrous Items

  - Chain A (100%): \[L1\], \[L2\], \[L3\], \[L4\], \[L5\], \[L6\],
    > \[L7\], \[L8\], \[L9\], \[L10\]

**Cross-Chain Recipes:**

- \[Recipe 1 Name\]: Req (Gen1_ChainA_L6 + Gen4_ChainA_L5)

- \[Recipe 2 Name\]: Req (Gen3_ChainA_L8 + Gen5_ChainA_L4)

- Chains above are placeholders (TBC). More recipes will be added; every
  > ingredient must name its generator, chain and level. Ingredients are
  > identical for all classes; only names differ. Usage: see 9.3.1.

**Encounters:**

- **Endless Dynamic Generation:** Encounters are not a static list. They
  > are procedurally generated on the fly based on the Player's Level,
  > utilizing a 20/40/30/10 (Easy/Medium/Hard/Deadly) difficulty
  > distribution.

### 9.3. Encounters (Order Board)

The Order Board is endless. Encounters are procedurally generated on the
fly by the game engine whenever a slot opens.

- **Player Level Scaling:** The player's overall level dictates the base
  > XP budget for the encounter and caps the maximum item level that can
  > be requested.

- **Difficulty Distribution:** Every generated encounter rolls against a
  > fixed probability curve: Easy (20%), Medium (40%), Hard (30%),
  > Deadly (10%).

- **Generation Logic:** The rolled difficulty applies a multiplier to
  > the base XP budget. The engine then randomly selects items from the
  > player's unlocked generator chains until the total Challenge Rating
  > (Item Level = CR) matches the required XP budget.

- **Request Weighting:** Each (generator, chain) is requested with
  > weight = generator request weight × the chain's current drop rate,
  > with a minimum floor so rare chains still appear occasionally.

- **Level Gating:** Only unlocked generators and chains can be requested
  > (thresholds tunable):

  - Level 1: Gen1 (A, B), Gen2 (A, B)

  - Level 3: Gen3

  - Level 6: Gen4

  - Level 10: Gen5, Gen2 Chain C

  - Level 15: Gen6

  - Level 20: Gen0 Scavenger (drops Gen1 Chain A, no new request type)

- **Slots:** 3 encounter slots at the start (up to 7 via XP). Encounters
  > can be dismissed for free and are regenerated.

### 9.3.1. Special Encounters (Recipe Orders)

Cross-chain recipe items are used in special encounters, or can be sold.

- **Crafting:** Dragging one ingredient onto the other consumes both and
  > creates a recipe item. Recipe items cannot be merged, buffed by the
  > Bard, or used in normal encounters.

- **Recipe Value:** Sum of the ingredients' CR XP (e.g. L6 + L5 = 700 +
  > 450 = 1,150). Sell price = max(10, value / 5) Gold, i.e. 100% of
  > value (1,150 → 230 Gold).

- **Frequency:** One special encounter appears every 4 hours (real time,
  > also while offline; at most one waiting). It uses its own dedicated
  > slot.

- **Generation:** Difficulty is rolled as normal, then the XP budget is
  > 2.5× the normal budget. One available recipe item is required (its
  > value counts toward the budget); normal items fill the rest.

- **Rewards:** 3× the normal Gold/XP reward formula.

- **Availability:** A recipe is available once all its ingredient
  > generators/chains are unlocked. If none are, no special encounter
  > spawns.

### 9.4. XP Sinks (Full Cost Tables)

20. **Generator Level Upgrades (Costs scale per generator):**

    - L2: 100 XP \| L3: 250 XP \| L4: 500 XP \| L5: 1,000 XP \| L6:
      > 2,000 XP \| L7: 4,000 XP \| L8: 8,000 XP \| L9: 15,000 XP \|
      > L10: 25,000 XP

21. **Secondary Drop Rate Boost (Chain B):**

    - L1 (12%): 300 XP \| L2 (15%): 800 XP \| L3 (20%): 2,000 XP

22. **Tertiary Drop Rate Boost (Chain C):**

    - L1 (3%): 500 XP \| L2 (5%): 1,500 XP \| L3 (7%): 4,000 XP

23. **Lucky Drop Chance (+2/+3 Levels):**

    - L1 (2%): 200 XP \| L2 (4%): 500 XP \| L3 (8%): 1,200 XP \| L4
      > (15%): 3,000 XP

24. **Gold Multipliers on Encounters:**

    - L1 (1.25x): 400 XP \| L2 (1.5x): 1,000 XP \| L3 (1.75x): 2,500 XP
      > \| L4 (2.0x): 5,000 XP

25. **Encounter Slots:**

    - Slot 4: 250 XP \| Slot 5: 750 XP \| Slot 6: 2,000 XP \| Slot 7:
      > 5,000 XP

26. **Class Skill Cooldown Reduction:**

    - L1 (50m): 500 XP \| L2 (40m): 1,500 XP \| L3 (30m): 4,000 XP

27. **Generator Cooldown Reduction:**

    - L1 (-5%): 1,000 XP \| L2 (-10%): 3,000 XP \| L3 (-20%): 8,000 XP

28. **Inventory Expansion (5 base slots, up to 10 purchasable):**

    - S1: 100 XP \| S2: 200 XP \| S3: 400 XP \| S4: 800 XP \| S5: 1,600
      > XP \| S6: 3,200 XP \| S7: 6,400 XP \| S8: 12,000 XP \| S9:
      > 20,000 XP \| S10: 35,000 XP

29. **Daily Shop Base Items:**

    - Level 1 Item: 10 XP \| Level 2 Item: 25 XP

30. **Merge Critical Success:**

    - L1 (1%): 300 XP \| L2 (2%): 800 XP \| L3 (3%): 1,500 XP \| L4
      > (4%): 3,000 XP \| L5 (5%): 5,000 XP \| L6 (6%): 10,000 XP

31. **Generator Charge Capacity:**

    - L1 (+10%): 400 XP \| L2 (+20%): 1,000 XP \| L3 (+30%): 2,000 XP \|
      > L4 (+50%): 4,000 XP \| L5 (+75%): 8,000 XP \| L6 (+100%): 15,000
      > XP

### 9.5. Castle Upgrades (Full Gold Sink Tracking)

**Tier 1: Restoration**

- Clear Courtyard Rubble: 50 Gold

- Mend the Wooden Gates: 150 Gold

- Repair Basic Curtain Wall: 300 Gold

- Rebuild the Peasant Barracks: 600 Gold

- Restore the Well: 800 Gold

**Tier 2: Expansion**

- Construct the Blacksmith's Forge: 1,500 Gold

- Build the Royal Stables: 2,500 Gold

- Pave the Main Courtyard: 4,000 Gold

- Establish the Merchant Marketplace: 6,000 Gold

- Erect the Watchtowers: 8,500 Gold

**Tier 3: Luxury**

- Upgrade to Iron Portcullis: 12,000 Gold

- Plant the Royal Gardens: 18,000 Gold

- Construct the Grand Feasting Hall: 25,000 Gold

- Lay Marble Courtyards: 35,000 Gold

- Furnish the Luxury Throne Room: 50,000 Gold

**Tier 4: Magical Defenses**

- Inscribe Rune Wards on Walls: 75,000 Gold

- Summon the Enchanted Arcane Moat: 100,000 Gold

- Raise the Floating Wizard's Tower: 150,000 Gold

- Install the Portal Hub: 250,000 Gold

- Awaken the Guardian Golem: 500,000 Gold

# 10. Engine Architecture & Data Handling

## 10.1. Strict Separation of Logic and Presentation (MVC)

The game utilizes a Model-View-Controller (MVC) architecture to
completely decouple the backend economy math from the frontend cosmetic
presentation.

**The Backend (Math & Logic)**

The procedural encounter generation script and the core merge logic are
entirely class-agnostic. The backend does not process or output cosmetic
strings. Instead, it generates and tracks raw internal identifiers
(e.g., {"generator": "Gen1", "chain": "ChainA", "level": 4}).

**The Frontend (Cosmetic View)**

The game engine handles all localization and flavor text. When a player
receives an encounter or spawns an item, the frontend reads the raw
identifier payload from the backend, checks the player's active class
(e.g., Paladin, Rogue), and queries an external items.json database to
render the appropriate name and image (e.g., translating Gen1_ChainA_L4
into "Iron Dagger" for a Rogue character).

**Advantages of this Architecture:**

32. **True Class Agnosticism:** The backend requires zero knowledge of
    > the player's cosmetic choices, ensuring perfect mathematical
    > balance across all roles.

33. **Efficient Payloads:** Transmitting JSON logic objects is vastly
    > lighter for the engine than passing hardcoded display strings back
    > and forth.

34. **Seamless Localization:** Game text, item renaming, and
    > localization can be updated purely via the items.json file without
    > ever risking structural changes to the game's core economy logic.
