import itertools
import json
import os
from collections import defaultdict
import sys

# Logger to mirror terminal output to a file
class DualLogger(object):
    def __init__(self, filename="live_playoff_odds.txt"):
        self.terminal = sys.stdout
        self.log = open(filename, "w", encoding="utf-8")
    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
    def flush(self):
        self.terminal.flush()
        self.log.flush()

sys.stdout = DualLogger()

# 1. Current Stats (Entering Week 6)
current_standings = {
    "Cody": [13, 3, 2, 0], "Austin": [10, 2, 2, 0], "Ian": [10, 2, 2, 0],
    "Josh": [10, 2, 1, 2], "Nick": [10, 1, 3, 1], "Ashley": [9, 2, 1, 1],
    "Michael": [9, 2, 1, 1], "Rachel M": [8, 1, 2, 1], "Jack M": [8, 1, 2, 1],
    "Carly": [7, 2, 0, 1], "Sam": [7, 1, 1, 2], "Brittany": [7, 1, 1, 2],
    "Jack C": [7, 1, 1, 2], "Rachel F": [6, 1, 1, 1], "Dan": [6, 1, 0, 3],
    "Richie": [5, 1, 1, 0], "Tyler": [5, 0, 2, 1], "Emma": [5, 0, 1, 3],
    "Ryan": [4, 1, 0, 1], "Steve": [4, 0, 1, 2]
}

points_map = {0: 3, 1: 2, 2: 1, 3: 0}
placement_names = {0: "1st", 1: "2nd", 2: "3rd", 3: "4th"}

players = list(current_standings.keys())
pid_map = {p: i for i, p in enumerate(players)}

def make_score(pts, firsts, seconds, thirds):
    return (pts << 12) | (firsts << 8) | (seconds << 4) | (thirds)

base_scores = [make_score(*current_standings[p]) for p in players]
placements = list(itertools.permutations([0, 1, 2, 3]))

# 2. Safely load the Schedule text file and parse into JSON
file_path = 'output/Schedules.txt'
if not os.path.exists(file_path):
    # Fallback if the file was saved without a .txt extension
    file_path = 'Schedules'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        # json.load() perfectly parses text into a Python dictionary
        schedule_data = json.load(f)
except FileNotFoundError:
    print(f"Error: Could not find '{file_path}'. Please ensure it is in the same folder.")
    sys.exit()
except json.JSONDecodeError:
    print(f"Error: The contents of '{file_path}' are not valid JSON.")
    sys.exit()

# Extract Week 6 matchups
week_6_matchups = []
for week in schedule_data.get("2026", []):
    if week.get("week") == "Week 6":
        week_6_matchups = week.get("results", [])
        break

if not week_6_matchups:
    print("Error: Could not find Week 6 data in the schedule file.")
    sys.exit()

# 3. Build the Outcomes (Locking in finished games)
games_outcomes = []
completed_games_count = 0

for matchup in week_6_matchups:
    players_in_game = matchup.get("players", [])
    
    # Check if this game is finished by looking for the "placement" key in the first player
    is_finished = "placement" in players_in_game[0]
    
    outcomes = []
    if is_finished:
        completed_games_count += 1
        delta = [0] * 20
        p_res = [-1] * 20
        for p_data in players_in_game:
            pid = pid_map[p_data["player"]]
            # Convert string "1", "2", "3", "4" into an integer index (0, 1, 2, 3)
            place = int(p_data["placement"]) - 1 
            pts = points_map[place]
            f = 1 if place == 0 else 0
            s = 1 if place == 1 else 0
            t = 1 if place == 2 else 0
            delta[pid] = make_score(pts, f, s, t)
            p_res[pid] = place
        outcomes.append((delta, p_res)) 
    else:
        # Game is unplayed, generate all 24 permutations
        for p_perm in placements:
            delta = [0] * 20
            p_res = [-1] * 20 
            for i, placement in enumerate(p_perm):
                pid = pid_map[players_in_game[i]["player"]]
                pts = points_map[placement]
                f = 1 if placement == 0 else 0
                s = 1 if placement == 1 else 0
                t = 1 if placement == 2 else 0
                delta[pid] = make_score(pts, f, s, t)
                p_res[pid] = placement
            outcomes.append((delta, p_res))
            
    games_outcomes.append(outcomes)

# 4. Run the dynamic simulation
total_scenarios = 0
overall_outright = [0] * 20
overall_playin = [0] * 20
placement_stats = [[[0, 0, 0] for _ in range(4)] for _ in range(20)]

print(f"Detected {completed_games_count} completed games and {5 - completed_games_count} unplayed games.")

for combo in itertools.product(*games_outcomes):
    total_scenarios += 1
    
    scores = [base_scores[i] + sum(g[0][i] for g in combo) for i in range(20)]
    p_res = [max(g[1][i] for g in combo) for i in range(20)]
    
    score_groups = defaultdict(list)
    for pid, sc in enumerate(scores):
        score_groups[sc].append(pid)
        
    sorted_scores = sorted(score_groups.keys(), reverse=True)
    
    spots_filled = 0
    outright_set = set()
    playin_set = set()
    
    for sc in sorted_scores:
        group = score_groups[sc]
        g_size = len(group)
        if spots_filled < 8:
            if spots_filled + g_size <= 8:
                outright_set.update(group)
            else:
                playin_set.update(group)
            spots_filled += g_size
        else:
            break
            
    for pid in range(20):
        place = p_res[pid]
        placement_stats[pid][place][0] += 1
        if pid in outright_set:
            overall_outright[pid] += 1
            placement_stats[pid][place][1] += 1
        elif pid in playin_set:
            overall_playin[pid] += 1
            placement_stats[pid][place][2] += 1

print(f"Calculating {total_scenarios:,} remaining possible futures...\\n")

# 5. Output Results in the requested format
sorted_pids = sorted(range(20), key=lambda x: overall_outright[x] + overall_playin[x], reverse=True)

for pid in sorted_pids:
    p_name = players[pid]
    o_out = overall_outright[pid]
    o_play = overall_playin[pid]
    o_tot = o_out + o_play
    
    if total_scenarios == 0 or o_tot == 0:
        continue
        
    o_pct = (o_tot / total_scenarios) * 100
    print(f"{p_name} (Overall Chance: {o_pct:.2f}%)")
    
    for place in range(4):
        tot = placement_stats[pid][place][0]
        out = placement_stats[pid][place][1]
        play = placement_stats[pid][place][2]
        
        if tot == 0: continue
        
        p_tot = out + play
        tot_pct = (p_tot / tot) * 100
        play_pct = (play / tot) * 100
        
        # If the player already secured this placement in a finished game, tag it
        status_note = " (LOCKED IN)" if (completed_games_count > 0 and tot == total_scenarios) else ""
        
        if p_tot == 0:
            print(f"  If {placement_names[place]}: ELIMINATED{status_note}")
        elif tot_pct == 100.0 and play_pct == 0.0:
            print(f"  If {placement_names[place]}: GUARANTEED{status_note}")
        else:
            playin_str = f" (Play-In Game {play_pct:.1f}%)" if play > 0 else ""
            print(f"  If {placement_names[place]}: {tot_pct:.2f}% chance{playin_str}{status_note}")
            
    print("")