import pandas as pd
from sklearn.ensemble import RandomForestRegressor

# --- CONFIGURATION ---
# We don't even need to specify the week anymore! 
# We just look for games that haven't happened yet.

# 1. Load the Data
try:
    df = pd.read_json('machineLearning/bgl_ml_features.json')
except ValueError:
    print("Error: Could not read JSON. Did you run 'node buildMLDataset.js'?")
    exit()

# 2. Separate "History" (Train) from "Future" (Predict)
# TRAIN set: Rows where 'Placement' is NOT empty (NaN)
train_df = df.dropna(subset=['Placement'])

# PREDICT set: Rows where 'Placement' IS empty (NaN)
predict_df = df[df['Placement'].isnull()].copy()

if predict_df.empty:
    print("No future games found to predict!")
    print("Check your Schedules.txt: Ensure the upcoming week's games have no 'placement' value.")
    exit()

print(f"Training on {len(train_df)} completed games...")
print(f"Predicting outcomes for {len(predict_df)} upcoming player matches...")

# 3. Define Features
features = [
    'Difficulty',          # Game weight
    'IsHome',              # Home field advantage?
    'CareerAvg',           # Long-term skill
    'Tenure',              # Experience (Total games played)
    'PrevGame',            # Last game result
    'Prev2Avg',            # Short-term form
    'WinStreak',           # Current winning streak
    'NoLastStreak',
    'SecondStreak',
    'ThirdStreak',         # Consistency streak
    'PlayoffAppearances',  # Clutch factor
    'LastSeasonAvg',       # Recent history
    'H2H_WinRate',         # Specific matchup win rate
    'SeasonPoints',        # Current season momentum
    'SeasonSOS',           # Strength of Schedule faced so far
    'CurrentOppAvg',       # Strength of opponents in THIS game
    'MechanicSkill',
    'Consistency_StdDev',
    'LastTitlePlacement',
    'IsRookie',
    'RookieOpponents',
    'ComplexityDelta'

]

# 4. Train the Model
X_train = train_df[features]
y_train = train_df['Placement']

model = RandomForestRegressor(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# 5. Predict the Future
X_predict = predict_df[features]
predict_df['Predicted_Rank'] = model.predict(X_predict)

# 6. Formatting the Output
print("\n" + "="*40)
print("📢  BGL PREDICTIONS: UPCOMING WEEK  📢")
print("="*40 + "\n")

# Group by Game and Year/Week to handle multiple weeks if necessary
groups = predict_df.groupby(['Year', 'Week', 'Game'])

for (year, week, game), group_data in groups:
    print(f"📅 {year} {week}: {game}")
    print("-" * 30)
    
    # We assume players in the same pod appear sequentially in the JSON.
    # We'll chunk them into groups of 4 (or however many players are in a pod)
    # This is a simple heuristic; strictly speaking, we should have a 'PodID', 
    # but the sequential order from Schedules.txt usually preserves this.
    
    players = group_data.to_dict('records')
    
    # Create chunks of 4 (standard pod size)
    # If you have 5-player games, this visual grouping might be slightly off, 
    # but the predictions are still valid.
    pod_size = 4 
    for i in range(0, len(players), pod_size):
        pod = players[i:i+pod_size]
        
        # Sort this specific pod by their predicted rank (lowest is best)
        pod.sort(key=lambda x: x['Predicted_Rank'])
        
        print(f"  🏆 Matchup {i//pod_size + 1}")
        for rank, p in enumerate(pod, 1):
            # We print the raw model score (e.g. 1.8) to show confidence
            print(f"    {rank}. {p['Player']} (Score: {p['Predicted_Rank']:.2f})")
        print("")
    print("\n")

print("(Note: 'Score' is the predicted average placement. Lower is better.)")