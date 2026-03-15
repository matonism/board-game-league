import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor

# --- CONFIGURATION ---
TARGET_PLAYER = "Rachel F"  # Who do you want to explain?
TARGET_WEEK = "Week 4"      # Which week?
TARGET_YEAR = 2026

# 1. Load Data
try:
    df = pd.read_json('machineLearning/bgl_ml_features.json')
except ValueError:
    print("Error: Could not find bgl_ml_features.json")
    exit()

# 2. Separate History (Train) and Future (Predict)
history_df = df.dropna(subset=['Placement'])
future_df = df[df['Placement'].isnull()]

# 3. Define Features (Match your build script)
features = [
    'Difficulty', 'IsHome', 'CareerAvg', 'TenureGap',
    'PrevGame', 'Prev2Avg', 'WinStreak', 'NoLastStreak', 
    'PlayoffAppearances', 'LastSeasonAvg', 'H2H_WinRate', 
    'SeasonPoints', 'PointsAbovePace', 'SeasonSOS', 'CurrentOppAvg',
    'Consistency_StdDev', 'LastTitlePlacement', 'MechanicSkill',
    'IsRookie', 'RookieOpponents', 'ComplexityDelta'
]

# 4. Train Model to get Feature Importance
X_train = history_df[features]
y_train = history_df['Placement']

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

importances = dict(zip(features, model.feature_importances_))

# 5. Determine "Direction" of Features
# (Does a HIGH number mean you Win or Lose?)
# We calculate correlation between Feature and Placement.
# Remember: Placement 1 is GOOD, 4 is BAD.
# Negative Correlation = High Feature leads to Low Placement (GOOD) -> e.g. Win Streak
# Positive Correlation = High Feature leads to High Placement (BAD) -> e.g. Career Avg (Lower is better)
correlations = {}
for feat in features:
    corr = history_df[feat].corr(history_df['Placement'])
    correlations[feat] = corr

# 6. Establish the "Winner's Benchmark"
# What does the average 1st Place finisher look like?
winners_df = history_df[history_df['Placement'] == 1]
winner_profile = winners_df[features].mean()

# 7. Find the Target Game
target_row = future_df[
    (future_df['Player'] == TARGET_PLAYER) & 
    (future_df['Year'] == TARGET_YEAR) & 
    (future_df['Week'] == TARGET_WEEK)
]

if target_row.empty:
    print(f"Could not find a future game for {TARGET_PLAYER} in {TARGET_WEEK}!")
    print("Check your spelling or ensure the game is in Schedules.txt without a placement.")
    exit()

target_row = target_row.iloc[0] # Get the single row (Series)

# 8. Calculate "Reasons"
print(f"\n🕵️‍♀️ EXPLAINING PREDICTION FOR: {TARGET_PLAYER} ({TARGET_WEEK}) 🕵️‍♀️")
print(f"Game: {target_row['Game']} (Difficulty: {target_row['Difficulty']})")

predicted_rank = model.predict([target_row[features]])[0]
print(f"Model Predicted Rank: {predicted_rank:.2f}\n")

print("--- WHY? (Gap Analysis) ---")
print("We compare Rachel's stats in this specific matchup vs. the average Winner's profile.\n")

reasons = []

for feat in features:
    rachel_val = target_row[feat]
    winner_val = winner_profile[feat]
    importance = importances[feat]
    direction = correlations[feat] # + or -
    
    # Calculate the Gap
    # If correlation is Positive (High = Bad), we want Rachel < Winner
    # If correlation is Negative (High = Good), we want Rachel > Winner
    
    diff = rachel_val - winner_val
    
    # "Impact" represents how much this feature is hurting/helping her score
    # Positive Impact = Hurting Score (Pushing rank up to 4)
    # Negative Impact = Helping Score (Pushing rank down to 1)
    
    if direction > 0: # High is Bad (e.g. CareerAvg)
        impact = diff * importance
    else: # High is Good (e.g. Win Streak)
        impact = -diff * importance # Invert because lower val = bad result

    reasons.append({
        'Feature': feat,
        'Rachel': rachel_val,
        'AvgWinner': winner_val,
        'Impact': impact,
        'Importance': importance
    })

# Sort by Impact (Highest Positive Impact = Biggest Reason for Losing)
reasons.sort(key=lambda x: x['Impact'], reverse=True)

# Print Top 3 "Reasons for Losing" (Factors pushing rank HIGHER)
print("🔻 TOP FACTORS HURTING HER ODDS (Pushing Rank to 3rd/4th):")
for r in reasons[:4]:
    if r['Impact'] > 0:
        print(f"  • {r['Feature']}: {r['Rachel']:.2f}")
        print(f"    (Avg Winner has {r['AvgWinner']:.2f}. Gap: {r['Impact']:.4f})")

print("\n")

# Print Top 3 "Strengths" (Factors keeping her competitive)
print("✅ TOP STRENGTHS (Pushing Rank to 1st):")
for r in reversed(reasons[-4:]):
    if r['Impact'] < 0:
        print(f"  • {r['Feature']}: {r['Rachel']:.2f}")
        print(f"    (Avg Winner has {r['AvgWinner']:.2f})")