import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# ==========================================
# 1. LOAD AND PREPARE DATA
# ==========================================
# Load the dataset you generated
df = pd.read_json('machineLearning/bgl_ml_features.json')

# Convert 'Year' to numeric just in case
df['Year'] = pd.to_numeric(df['Year'])
# df['weekNum'] = pd.to_numeric(df['weekNum'])

# Define the features (X) we want the model to learn from
features = [
    'Difficulty',          # Game weight
    'IsHome',              # Home field advantage?
    'CareerAvg',           # Long-term skill
    'Tenure',              # Experience (Total games played)
    'TenureGap',
    'PrevGame',            # Last game result
    'Prev2Avg',            # Short-term form
    'WinStreak',           # Current winning streak
    'NoLastStreak',
    'SecondStreak',
    'ThirdStreak',        # Consistency streak
    'PlayoffAppearances',  # Clutch factor
    'LastSeasonAvg',       # Recent history
    'H2H_WinRate',         # Specific matchup win rate
    'SeasonPoints',        # Current season momentum
    'PointsAbovePace',
    'SeasonSOS',           # Strength of Schedule faced so far
    'CurrentOppAvg',       # Strength of opponents in THIS game
    'MechanicSkill',
    'Consistency_StdDev',
    'LastTitlePlacement',
    'IsRookie',
    'RookieOpponents',
    'ComplexityDelta'

]

# Define the target (y) we want to predict
target = 'Placement'

# ==========================================
# 2. SPLIT DATA (TRAIN vs TEST)
# ==========================================
# We train on history (2022-2025) and test on the current season (2026)
train_df = df[df['Year'] < 2026]
# test_df = df[df['Year'] == 2026 or (df['Year'] == 2025 and df['weekNum'] > 2)]
test_df = df[df['Year'] == 2026]

# --- NEW LINE: Remove rows with no result for training ---
df_clean = test_df.dropna(subset=['Placement']) 
# -------------------------------------------------------
test_df = df_clean;

X_train = train_df[features]
y_train = train_df[target]

X_test = test_df[features]
y_test = test_df[target]

print(f"Training on {len(X_train)} historical games (2022-2025)...")
print(f"Testing on {len(X_test)} games from the 2026 season...")

# ==========================================
# 3. TRAIN THE MODEL
# ==========================================
# Initialize the Random Forest Regressor
rf_model = RandomForestRegressor(n_estimators=100, random_state=42)

# Fit the model to the training data
rf_model.fit(X_train, y_train)

# ==========================================
# 4. EVALUATE PERFORMANCE
# ==========================================
# Make predictions on the 2026 season
predictions = rf_model.predict(X_test)

# Calculate Error Metrics
mae = mean_absolute_error(y_test, predictions)

print("\n--- Model Performance ---")
print(f"Mean Absolute Error (MAE): {mae:.4f}")
print(f"  -> On average, the prediction is off by {mae:.2f} places.")
print(f"  -> (e.g. If it predicts 2.1 and you get 3rd, the error is 0.9)")

# ==========================================
# 5. FEATURE IMPORTANCE
# ==========================================
# See what matters most
importances = pd.DataFrame({
    'Feature': features,
    'Importance': rf_model.feature_importances_
}).sort_values(by='Importance', ascending=False)

print("\n--- Top Predictive Factors ---")
print(importances.head(len(features)))

# ==========================================
# 6. MAKE A NEW PREDICTION
# ==========================================
# Example: Predicting a hypothetical match for 'Nick'
print("\n--- Example Prediction ---")
new_game = {
    'Difficulty': 2.5,        # A medium-heavy game
    'IsHome': 1,              # Playing at home
    'CareerAvg': 1.88,        # Nick's stats
    'Tenure': 30,
    'TenureGap': 2,
    'PrevGame': 1,
    'Prev2Avg': 1.5,
    'WinStreak': 1,
    'NoLastStreak': 5,
    'SecondStreak': 1,
    'ThirdStreak': 0,
    'PlayoffAppearances': 3,
    'LastSeasonAvg': 2.0,
    'H2H_WinRate': 0.60,      # Good record vs this pod
    'SeasonPoints': 10,
    'PointsAbovePace': 1,
    'SeasonSOS': 2.1,
    'CurrentOppAvg': 2.4,      # Opponents are decent
    'MechanicSkill': 1,
    'Consistency_StdDev': 2.1,
    'LastTitlePlacement': 3,      # Opponents are decent
    'IsRookie': 0,        # Am I new?
    'RookieOpponents': 1, # Am I playing against newbies?
    'ComplexityDelta': 0.539  # Is this game too heavy/light for me?
}

# Convert dictionary to DataFrame (1 row)
input_row = pd.DataFrame([new_game])

# Predict
predicted_rank = rf_model.predict(input_row)[0]
print(f"Hypothetical Prediction for Nick: {predicted_rank:.2f}")