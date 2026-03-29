import itertools
from collections import defaultdict
import sys

# 1. Create a Logger to mirror terminal output to a file
class DualLogger(object):
    def __init__(self, filename="results2.txt"):
        self.terminal = sys.stdout
        self.log = open(filename, "w", encoding="utf-8")

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)

    def flush(self):
        self.terminal.flush()
        self.log.flush()

# Redirect standard output to our DualLogger
sys.stdout = DualLogger("results2.txt")

# 2. Current Stats (Entering Week 6, 2026)
current_standings = {
    "Cody": [13, 3, 2, 0], "Austin": [10, 2, 2, 0], "Ian": [10, 2, 2, 0],
    "Josh": [10, 2, 1, 2], "Nick": [10, 1, 3, 1], "Ashley": [9, 2, 1, 1],
    "Michael": [9, 2, 1, 1], "Rachel M": [8, 1, 2, 1], "Jack M": [8, 1, 2, 1],
    "Carly": [7, 2, 0, 1], "Sam": [7, 1, 1, 2], "Brittany": [7, 1, 1, 2],
    "Jack C": [7, 1, 1, 2], "Rachel F": [6, 1, 1, 1], "Dan": [6, 1, 0, 3],
    "Richie": [5, 1, 1, 0], "Tyler": [5, 0, 2, 1], "Emma": [5, 0, 1, 3],
    "Ryan": [4, 1, 0, 1], "Steve": [4, 0, 1, 2]
}

# 3. Week 6 Matchups
matchups = [
    ["Ashley", "Rachel M", "Rachel F", "Emma"],
    ["Michael", "Richie", "Steve", "Tyler"],
    ["Austin", "Carly", "Brittany", "Cody"],
    ["Nick", "Ian", "Josh", "Dan"],
    ["Jack M", "Jack C", "Sam", "Ryan"]
]

points_map = {0: 3, 1: 2, 2: 1, 3: 0}
placement_names = {0: "1st", 1: "2nd", 2: "3rd", 3: "4th"}

# Metrics tracking
total_scenarios = 0
playoff_appearances = defaultdict(int)
placement_stats = defaultdict(lambda: {0: [0,0], 1: [0,0], 2: [0,0], 3: [0,0]})

example_make = {p: None for p in current_standings}
example_miss = {p: None for p in current_standings}

min_8th_score_tuple = (float('inf'), 0, 0, 0)
min_8th_scenario = None
max_8th_score_tuple = (-1, 0, 0, 0)
max_8th_scenario = None

placements = list(itertools.permutations([0, 1, 2, 3]))

def get_standings_for_scenario(scenario_results):
    """Calculates the final standings 1-20 given a specific Week 6 outcome."""
    scenario_st = {k: v[:] for k, v in current_standings.items()}
    
    for game_idx, matchup in enumerate(matchups):
        results = scenario_results[game_idx]
        for player_idx, player in enumerate(matchup):
            placement = results[player_idx]
            pts = points_map[placement]
            
            scenario_st[player][0] += pts
            if placement == 0: scenario_st[player][1] += 1
            elif placement == 1: scenario_st[player][2] += 1
            elif placement == 2: scenario_st[player][3] += 1
            
    sorted_players = sorted(
        scenario_st.keys(),
        key=lambda p: (
            scenario_st[p][0], scenario_st[p][1],
            scenario_st[p][2], scenario_st[p][3]
        ),
        reverse=True
    )
    return sorted_players, scenario_st

def print_full_scenario(title, scenario_tuple):
    """Formats and prints the Week 6 results and the final 1-20 standings."""
    print(f"\n{title}")
    print("-" * 40)
    print("WEEK 6 RESULTS:")
    for g_idx, matchup in enumerate(matchups):
        res = scenario_tuple[g_idx]
        matchup_res = [f"{matchup[i]} ({placement_names[res[i]]})" for i in range(4)]
        print(f"  Game {g_idx+1}: " + ", ".join(matchup_res))
        
    sorted_players, final_st = get_standings_for_scenario(scenario_tuple)
    
    print("\nFINAL STANDINGS:")
    for i, p in enumerate(sorted_players):
        stats = final_st[p]
        cutoff_marker = "  <-- PLAYOFF CUTOFF" if i == 7 else ""
        print(f"  {i+1}. {p}: {stats[0]} pts (Tiebreakers: {stats[1]}x 1st, {stats[2]}x 2nd, {stats[3]}x 3rd){cutoff_marker}")
    print("-" * 40)

print("Calculating 7,962,624 scenarios. This will take roughly 1-2 minutes...")

# 4. Main simulation loop
for g1 in placements:
    for g2 in placements:
        for g3 in placements:
            for g4 in placements:
                for g5 in placements:
                    total_scenarios += 1
                    scenario_results = (g1, g2, g3, g4, g5)
                    
                    sorted_players, final_st = get_standings_for_scenario(scenario_results)
                    top_8 = set(sorted_players[:8])
                    
                    # Track 8th place extremes
                    eighth_player = sorted_players[7]
                    eighth_score = tuple(final_st[eighth_player])
                    
                    if eighth_score < min_8th_score_tuple:
                        min_8th_score_tuple = eighth_score
                        min_8th_scenario = scenario_results
                    if eighth_score > max_8th_score_tuple:
                        max_8th_score_tuple = eighth_score
                        max_8th_scenario = scenario_results
                    
                    # Track player stats
                    for player in top_8:
                        playoff_appearances[player] += 1
                        if example_make[player] is None:
                            example_make[player] = scenario_results
                            
                    for player in sorted_players[8:]:
                        if example_miss[player] is None:
                            example_miss[player] = scenario_results
                        
                    # Track placement-specific stats
                    for game_idx, matchup in enumerate(matchups):
                        results = scenario_results[game_idx]
                        for player_idx, player in enumerate(matchup):
                            placement = results[player_idx]
                            placement_stats[player][placement][1] += 1
                            if player in top_8:
                                placement_stats[player][placement][0] += 1

# 5. Output Logic
print("\n=== BGL 2026 PLAYOFF BREAKDOWN ===")
sorted_by_odds = sorted(current_standings.keys(), key=lambda p: playoff_appearances[p], reverse=True)

for player in sorted_by_odds:
    overall_pct = (playoff_appearances[player] / total_scenarios) * 100
    print(f"\n{player} (Overall Chance: {overall_pct:.2f}%)")
    
    if overall_pct == 100.0:
        print("  Status: CLINCHED")
    elif overall_pct == 0.0:
        print("  Status: ELIMINATED")
    else:
        for place in range(4):
            made = placement_stats[player][place][0]
            total = placement_stats[player][place][1]
            if total > 0:
                pct = (made / total) * 100
                if pct == 100.0:
                    print(f"  If {placement_names[place]}: GUARANTEED")
                elif pct == 0.0:
                    print(f"  If {placement_names[place]}: ELIMINATED")
                else:
                    count_string = f" ({made:,} out of {total_scenarios:,} total scenarios)" if pct < 5.0 else ""
                    print(f"  If {placement_names[place]}: {pct:.2f}% chance{count_string}")

print("\n\n=== EXTREME 8TH PLACE CUTOFF SCENARIOS ===")
print_full_scenario("SCENARIO: LOWEST POSSIBLE SCORE TO QUALIFY (9 points)", min_8th_scenario)
print_full_scenario("SCENARIO: HIGHEST POSSIBLE SCORE TO MISS CUTOFF (11 points)", max_8th_scenario)

print("\n\n=== SLIM CHANCE EXAMPLES (WITH FULL STANDINGS) ===")
for p in sorted_by_odds:
    pct = (playoff_appearances[p] / total_scenarios) * 100
    if 0.0 < pct < 20.0:
        print_full_scenario(f"SCENARIO: HOW {p.upper()} MAKES THE PLAYOFFS ({pct:.2f}% chance)", example_make[p])
    elif 80.0 < pct < 100.0:
        print_full_scenario(f"SCENARIO: HOW {p.upper()} MISSES THE PLAYOFFS ({pct:.2f}% chance)", example_miss[p])