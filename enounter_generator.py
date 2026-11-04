import random

# Logic Map (No cosmetic strings needed)
GENERATOR_CHAINS = {
    "Gen1": ["ChainA", "ChainB"],
    "Gen2": ["ChainA", "ChainB", "ChainC"],
    "Gen3": ["ChainA"],
    "Gen4": ["ChainA", "ChainB"],
    "Gen5": ["ChainA", "ChainB"],
    "Gen6": ["ChainA"]
}

CR_XP_MAP = {1: 25, 2: 50, 3: 100, 4: 200, 5: 450, 6: 700, 7: 1100, 8: 1800, 9: 2300, 10: 2900}
DIFFICULTIES = ["Easy", "Medium", "Hard", "Deadly"]
DIFF_WEIGHTS = [20, 40, 30, 10]
DIFF_MULTIPLIERS = {"Easy": 0.75, "Medium": 1.0, "Hard": 1.5, "Deadly": 2.0}

def get_minimum_items_required(target_xp, max_level):
    temp_target = target_xp
    min_items = 0
    available_levels = [lvl for lvl in sorted(CR_XP_MAP.keys(), reverse=True) if lvl <= max_level]
    
    for lvl in available_levels:
        xp_val = CR_XP_MAP[lvl]
        if temp_target <= 0: break
        count = int(temp_target // xp_val)
        min_items += count
        temp_target -= (count * xp_val)
        
    if temp_target > 0: min_items += 1
    return max(1, min_items)

def generate_dynamic_encounter(player_level):
    base_xp_budget = 50 + (player_level * 30)
    difficulty = random.choices(DIFFICULTIES, weights=DIFF_WEIGHTS, k=1)[0]
    target_xp = base_xp_budget * DIFF_MULTIPLIERS[difficulty]
    
    max_item_level = min(10, max(1, (player_level // 5) + 2))
    min_items = get_minimum_items_required(target_xp, max_item_level)
    target_item_count = random.choice([min_items, min_items + 1, min_items + 2])
    
    item_levels = [1] * target_item_count
    
    def current_total_xp():
        return sum(CR_XP_MAP[lvl] for lvl in item_levels)
    
    while current_total_xp() < target_xp:
        valid_indices = [i for i, lvl in enumerate(item_levels) if lvl < max_item_level]
        if not valid_indices: break 
        item_levels[random.choice(valid_indices)] += 1
        
    # Output raw internal IDs instead of strings
    required_items = []
    for lvl in item_levels:
        gen_choice = random.choice(list(GENERATOR_CHAINS.keys()))
        chain_choice = random.choice(GENERATOR_CHAINS[gen_choice])
        required_items.append({"generator": gen_choice, "chain": chain_choice, "level": lvl})
        
    actual_xp = current_total_xp()
    
    return {
        "difficulty": difficulty,
        "target_xp_budget": int(target_xp),
        "actual_xp": actual_xp,
        "item_count": target_item_count,
        "required_items": required_items,
        "rewards": {"gold": max(10, int(actual_xp / 5)), "xp": max(2, int(actual_xp / 20))}
    }