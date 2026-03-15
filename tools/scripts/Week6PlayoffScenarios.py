import itertools
from collections import defaultdict

# 1. Current Stats (Entering Week 6, 2026)
current_standings = {
    "Cody": [13, 3, 2, 0], "Austin": [10, 2, 2, 0], "Ian": [10, 2, 2, 0],
    "Josh": [10, 2, 1, 2], "Nick": [10, 1, 3, 1], "Ashley": [9, 2, 1, 1],
    "Michael": [9, 2, 1, 1], "Rachel M": [8, 1, 2, 1], "Jack M": [8, 1, 2, 1],
    "Carly": [7, 2, 0, 1], "Sam": [7, 1, 1, 2], "Brittany": [7, 1, 1, 2],
    "Jack C": [7, 1, 1, 2], "Rachel F": [6, 1, 1, 1], "Dan": [6, 1, 0, 3],
    "Richie": [5, 1, 1, 0], "Tyler": [5, 0, 2, 1], "Emma": [5, 0, 1, 3],
    "Ryan": [4, 1, 0, 1], "Steve": [4, 0, 1, 2]
}

# 2. Week 6 Matchups
matchups = [
    ["Ashley", "Rachel M", "Rachel F", "Emma"],
    ["Michael", "Richie", "Steve", "Tyler"],
    ["Austin", "Carly", "Brittany", "Cody"],
    ["Nick", "Ian", "Josh", "Dan"],
    ["Jack M", "Jack C", "Sam", "Ryan"]
]

points_map = {0: 3, 1: 2, 2: 1, 3: 0}
placement_names = {0: "1st", 1: "2nd", 2: "3rd", 3: "4th"}

total_scenarios = 0
playoff_appearances = defaultdict(int)
# Tracks: {player: {placement: [times_made_playoffs, total_times_got_this_placement]}}
placement_stats = defaultdict(lambda: {0: [0,0], 1: [0,0], 2: [0,0], 3: [0,0]})

placements = list(itertools.permutations([0, 1, 2, 3]))

print("Calculating 7,962,624 scenarios. This will take a few moments...")

for g1 in placements:
    for g2 in placements:
        for g3 in placements:
            for g4 in placements:
                for g5 in placements:
                    total_scenarios += 1
                    scenario_standings = {k: v[:] for k, v in current_standings.items()}
                    scenario_results = [g1, g2, g3, g4, g5]
                    
                    for game_idx, matchup in enumerate(matchups):
                        results = scenario_results[game_idx]
                        for player_idx, player in enumerate(matchup):
                            placement = results[player_idx]
                            points_earned = points_map[placement]
                            
                            scenario_standings[player][0] += points_earned
                            if placement == 0: scenario_standings[player][1] += 1
                            elif placement == 1: scenario_standings[player][2] += 1
                            elif placement == 2: scenario_standings[player][3] += 1
                    
                    sorted_players = sorted(
                        scenario_standings.keys(),
                        key=lambda p: (
                            scenario_standings[p][0], scenario_standings[p][1],
                            scenario_standings[p][2], scenario_standings[p][3]
                        ),
                        reverse=True
                    )
                    
                    top_8 = set(sorted_players[:8])
                    for player in top_8:
                        playoff_appearances[player] += 1
                        
                    for game_idx, matchup in enumerate(matchups):
                        results = scenario_results[game_idx]
                        for player_idx, player in enumerate(matchup):
                            placement = results[player_idx]
                            placement_stats[player][placement][1] += 1
                            if player in top_8:
                                placement_stats[player][placement][0] += 1

print("\n--- BGL 2026 PLAYOFF SCENARIOS ---")
sorted_players = sorted(playoff_appearances.keys(), key=lambda p: playoff_appearances[p], reverse=True)

for player in sorted_players:
    overall_pct = (playoff_appearances[player] / total_scenarios) * 100
    print(f"\n{player} (Overall Chance: {overall_pct:.2f}%)")
    
    if overall_pct == 100.0:
        print("  Status: CLINCHED PLAYOFF SPOT")
    else:
        for place in range(4):
            made = placement_stats[player][place][0]
            total = placement_stats[player][place][1]
            if total > 0:
                pct = (made / total) * 100
                if pct == 100.0:
                    print(f"  If they finish {placement_names[place]}: GUARANTEED (Clinched)")
                elif pct > 0.0:
                    print(f"  If they finish {placement_names[place]}: {pct:.2f}% chance (Needs help)")
                else:
                    print(f"  If they finish {placement_names[place]}: ELIMINATED (0% chance)")

eliminated = set(current_standings.keys()) - set(playoff_appearances.keys())
if eliminated:
    print("\n--- MATHEMATICALLY ELIMINATED ---")
    for p in eliminated:
        print(f"{p}: 0.00% chance")