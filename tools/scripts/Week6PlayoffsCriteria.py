import itertools
import sys

class DualLogger(object):
    def __init__(self, filename="playoff_dependencies.txt"):
        self.terminal = sys.stdout
        self.log = open(filename, "w", encoding="utf-8")
    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
    def flush(self):
        self.terminal.flush()
        self.log.flush()

sys.stdout = DualLogger()

# 1. Current Stats
current_standings = {
    "Cody": [13, 3, 2, 0], "Austin": [10, 2, 2, 0], "Ian": [10, 2, 2, 0],
    "Josh": [10, 2, 1, 2], "Nick": [10, 1, 3, 1], "Ashley": [9, 2, 1, 1],
    "Michael": [9, 2, 1, 1], "Rachel M": [8, 1, 2, 1], "Jack M": [8, 1, 2, 1],
    "Carly": [7, 2, 0, 1], "Sam": [7, 1, 1, 2], "Brittany": [7, 1, 1, 2],
    "Jack C": [7, 1, 1, 2], "Rachel F": [6, 1, 1, 1], "Dan": [6, 1, 0, 3],
    "Richie": [5, 1, 1, 0], "Tyler": [5, 0, 2, 1], "Emma": [5, 0, 1, 3],
    "Ryan": [4, 1, 0, 1], "Steve": [4, 0, 1, 2]
}

players = list(current_standings.keys())
pid_map = {p: i for i, p in enumerate(players)}

matchups = [
    ["Ashley", "Rachel M", "Rachel F", "Emma"],
    ["Michael", "Richie", "Steve", "Tyler"],
    ["Austin", "Carly", "Brittany", "Cody"],
    ["Nick", "Ian", "Josh", "Dan"],
    ["Jack M", "Jack C", "Sam", "Ryan"]
]

# Map each player to their game index so we know who is playing whom
player_to_game = {}
for g_idx, matchup in enumerate(matchups):
    for p in matchup:
        player_to_game[p] = g_idx

points_map = {0: 3, 1: 2, 2: 1, 3: 0}
placement_names = {0: "1st", 1: "2nd", 2: "3rd", 3: "4th"}

success_counts = [[0]*4 for _ in range(20)]
total_counts = [[0]*4 for _ in range(20)]
dep_tracker = [[[[0]*4 for _ in range(20)] for _ in range(4)] for _ in range(20)]
overall_appearances = [0] * 20

def make_score(pts, firsts, seconds, thirds, pid):
    return (pts << 17) | (firsts << 13) | (seconds << 9) | (thirds << 5) | pid

base_scores = [make_score(current_standings[p][0], current_standings[p][1], current_standings[p][2], current_standings[p][3], i) for i, p in enumerate(players)]

placements = list(itertools.permutations([0, 1, 2, 3]))

games_outcomes = []
for matchup in matchups:
    outcomes = []
    for p_perm in placements:
        delta = [0]*20
        p_res = [-1]*20 
        for i, placement in enumerate(p_perm):
            pid = pid_map[matchup[i]]
            pts = points_map[placement]
            f = 1 if placement == 0 else 0
            s = 1 if placement == 1 else 0
            t = 1 if placement == 2 else 0
            delta[pid] = make_score(pts, f, s, t, 0)
            p_res[pid] = placement
        outcomes.append((p_perm, delta, p_res))
    games_outcomes.append(outcomes)

print("Analyzing filtered dependency logic for ~8M scenarios...\n")
total_scenarios = 0

for o1, d1, r1 in games_outcomes[0]:
    for o2, d2, r2 in games_outcomes[1]:
        for o3, d3, r3 in games_outcomes[2]:
            for o4, d4, r4 in games_outcomes[3]:
                for o5, d5, r5 in games_outcomes[4]:
                    total_scenarios += 1
                    
                    scores = [
                        base_scores[0]+d1[0]+d2[0]+d3[0]+d4[0]+d5[0], base_scores[1]+d1[1]+d2[1]+d3[1]+d4[1]+d5[1],
                        base_scores[2]+d1[2]+d2[2]+d3[2]+d4[2]+d5[2], base_scores[3]+d1[3]+d2[3]+d3[3]+d4[3]+d5[3],
                        base_scores[4]+d1[4]+d2[4]+d3[4]+d4[4]+d5[4], base_scores[5]+d1[5]+d2[5]+d3[5]+d4[5]+d5[5],
                        base_scores[6]+d1[6]+d2[6]+d3[6]+d4[6]+d5[6], base_scores[7]+d1[7]+d2[7]+d3[7]+d4[7]+d5[7],
                        base_scores[8]+d1[8]+d2[8]+d3[8]+d4[8]+d5[8], base_scores[9]+d1[9]+d2[9]+d3[9]+d4[9]+d5[9],
                        base_scores[10]+d1[10]+d2[10]+d3[10]+d4[10]+d5[10], base_scores[11]+d1[11]+d2[11]+d3[11]+d4[11]+d5[11],
                        base_scores[12]+d1[12]+d2[12]+d3[12]+d4[12]+d5[12], base_scores[13]+d1[13]+d2[13]+d3[13]+d4[13]+d5[13],
                        base_scores[14]+d1[14]+d2[14]+d3[14]+d4[14]+d5[14], base_scores[15]+d1[15]+d2[15]+d3[15]+d4[15]+d5[15],
                        base_scores[16]+d1[16]+d2[16]+d3[16]+d4[16]+d5[16], base_scores[17]+d1[17]+d2[17]+d3[17]+d4[17]+d5[17],
                        base_scores[18]+d1[18]+d2[18]+d3[18]+d4[18]+d5[18], base_scores[19]+d1[19]+d2[19]+d3[19]+d4[19]+d5[19]
                    ]
                    
                    scores.sort(reverse=True)
                    p_res = [max(r1[i], r2[i], r3[i], r4[i], r5[i]) for i in range(20)]
                    
                    for pid in range(20):
                        total_counts[pid][p_res[pid]] += 1
                    
                    for i in range(8):
                        pid = scores[i] & 0x1F
                        overall_appearances[pid] += 1
                        p_place = p_res[pid]
                        success_counts[pid][p_place] += 1
                        
                        for opid in range(20):
                            if opid != pid:
                                dep_tracker[pid][p_place][opid][p_res[opid]] += 1

def format_rule(op_name, observed):
    if observed == {0}: return f"{op_name} gets 1st"
    if observed == {1}: return f"{op_name} gets 2nd"
    if observed == {2}: return f"{op_name} gets 3rd"
    if observed == {3}: return f"{op_name} gets 4th"
    if observed == {0, 1}: return f"{op_name} gets 1st or 2nd"
    if observed == {2, 3}: return f"{op_name} gets 3rd or 4th"
    if observed == {1, 2}: return f"{op_name} gets 2nd or 3rd"
    if observed == {0, 3}: return f"{op_name} gets 1st or 4th"
    if observed == {0, 2}: return f"{op_name} gets 1st or 3rd"
    if observed == {1, 3}: return f"{op_name} gets 2nd or 4th"
    if observed == {1, 2, 3}: return f"{op_name} gets 2nd or worse"
    if observed == {0, 1, 2}: return f"{op_name} gets 3rd or better"
    if observed == {0, 2, 3}: return f"{op_name} does NOT get 2nd"
    if observed == {0, 1, 3}: return f"{op_name} does NOT get 3rd"
    return None

print("=== BGL 2026 DEPENDENCY EXPLAINER (FILTERED) ===\n")
sorted_pids = sorted(range(20), key=lambda i: overall_appearances[i], reverse=True)

for pid in sorted_pids:
    overall_pct = (overall_appearances[pid] / total_scenarios) * 100
    p_name = players[pid]
    
    if overall_pct == 100.0 or overall_pct == 0.0:
        continue 
        
    print(f"{p_name.upper()} (Overall Chance: {overall_pct:.2f}%)")
    
    for place in range(4):
        success = success_counts[pid][place]
        total = total_counts[pid][place]
        
        if total == 0 or success == 0:
            continue
            
        pct = (success / total) * 100
        
        if pct == 100.0:
            print(f"  If they finish {placement_names[place]}: GUARANTEED IN")
        else:
            rules = []
            for opid in range(20):
                if opid == pid: continue
                c1, c2, c3, c4 = dep_tracker[pid][place][opid]
                op_name = players[opid]
                
                # Determine what was actually possible for this opponent
                same_game = (player_to_game[p_name] == player_to_game[op_name])
                possible_placements = {0, 1, 2, 3}
                if same_game:
                    possible_placements.remove(place)
                
                # Determine what was observed in successful scenarios
                observed_placements = set()
                if c1 > 0: observed_placements.add(0)
                if c2 > 0: observed_placements.add(1)
                if c3 > 0: observed_placements.add(2)
                if c4 > 0: observed_placements.add(3)
                
                # If observed matches possible, it's a trivial given! Skip it.
                if observed_placements == possible_placements:
                    continue
                    
                rule_str = format_rule(op_name, observed_placements)
                if rule_str:
                    rules.append(rule_str)
                    
            if rules:
                print(f"  If they finish {placement_names[place]} ({pct:.2f}% chance), they strictly NEED:")
                for rule in rules:
                    print(f"    -> {rule}")
            else:
                print(f"  If they finish {placement_names[place]} ({pct:.2f}% chance):")
                print("    -> No strict single dependencies (relies on a chaotic mix of other outcomes)")
    print("-" * 50)