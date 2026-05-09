from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor


FEATURES_INSEASON: List[str] = [
    "Difficulty",
    "FamiliarGame",
    "IsHome",
    "CareerAvg",
    "Tenure",
    "TenureGap",
    "Elo",
    "EloGames",
    "OppAvgElo",
    "OppStdElo",
    "OppMaxElo",
    "PrevGame",
    "Prev2Avg",
    "WinStreak",
    "NoLastStreak",
    "SecondStreak",
    "ThirdStreak",
    "PlayoffAppearances",
    "LastSeasonAvg",
    "H2H_WinRate",
    "SeasonPPG",
    "SeasonAdjPPG",
    "PointsAbovePace",
    "SeasonSOS",
    "CurrentOppAvg",
    "CurrentOppStd",
    "CurrentOppMin",
    "CurrentOppMax",
    "MechanicSkill",
    "MechanicSkillSamples",
    "CategorySkill",
    "CategorySkillSamples",
    "Consistency_StdDev",
    "LastTitlePlacement",
    "IsRookie",
    "RookieOpponents",
    "ComplexityDelta",
]

FEATURES_PRESEASON: List[str] = [
    f for f in FEATURES_INSEASON
    if f not in {"SeasonPPG", "SeasonAdjPPG", "PointsAbovePace", "SeasonSOS"}
]


def _load_df() -> pd.DataFrame:
    data_path = Path(__file__).resolve().parent / "bgl_ml_features.json"
    return pd.read_json(data_path)


def _train_model(history_df: pd.DataFrame, features: List[str], seed: int = 42) -> Tuple[RandomForestRegressor, pd.Series]:
    X = history_df[features]
    y = pd.to_numeric(history_df["Placement"])
    model = RandomForestRegressor(n_estimators=400, random_state=seed)
    model.fit(X, y)
    importances = pd.Series(model.feature_importances_, index=features).sort_values(ascending=False)
    return model, importances


def _feature_directions(history_df: pd.DataFrame, features: List[str]) -> Dict[str, float]:
    """
    Sign of correlation with Placement.
    Placement: 1 is good, 4 is bad.
    Positive corr => higher feature tends to mean worse finish (higher placement number).
    Negative corr => higher feature tends to mean better finish.
    """
    dirs: Dict[str, float] = {}
    y = pd.to_numeric(history_df["Placement"])
    for f in features:
        dirs[f] = float(pd.to_numeric(history_df[f]).corr(y))
    return dirs


def _baseline_profile(pod_df: pd.DataFrame, features: List[str]) -> pd.Series:
    # Baseline for "impact" is the pod average (avoids tenure being trivially above a global winner average).
    return pod_df[features].mean()


@dataclass(frozen=True)
class PlayerExplanation:
    player: str
    predicted_exp_place: float
    top_hurt: List[Tuple[str, float, float, float]]   # (feature, value, winner_avg, impact)
    top_help: List[Tuple[str, float, float, float]]


def explain_pod(
    df: pd.DataFrame,
    year: str,
    week: str,
    game: str,
    pod_id: str | None,
    mode: str = "inseason",
    top_k: int = 6,
    seed: int = 42,
) -> Tuple[pd.DataFrame, pd.Series, List[PlayerExplanation]]:
    history_df = df.dropna(subset=["Placement"]).copy()
    future_df = df[df["Placement"].isnull()].copy()

    features = FEATURES_INSEASON if mode == "inseason" else FEATURES_PRESEASON
    model, importances = _train_model(history_df, features, seed=seed)
    directions = _feature_directions(history_df, features)

    mask = (
        (future_df["Year"].astype(str) == str(year))
        & (future_df["Week"].astype(str) == str(week))
        & (future_df["Game"].astype(str) == str(game))
    )
    if pod_id:
        mask = mask & (future_df["PodId"].astype(str) == str(pod_id))

    pod_df = future_df[mask].copy()
    if pod_df.empty:
        available = future_df.groupby(["Year", "Week", "Game", "PodId"]).size().reset_index(name="rows")
        return available, importances, []

    pod_df["Predicted_ExpPlace"] = model.predict(pod_df[features])
    baseline_prof = _baseline_profile(pod_df, features)

    explanations: List[PlayerExplanation] = []

    for _, row in pod_df.iterrows():
        impacts: List[Tuple[str, float, float, float]] = []
        for f in features:
            val = float(row[f])
            win = float(baseline_prof[f])
            imp = float(importances.get(f, 0.0))
            direction = float(directions.get(f, 0.0))

            # Gap from "winner profile", scaled by feature importance.
            # If direction > 0: higher feature tends to worsen placement (so val > win hurts)
            # If direction < 0: higher feature tends to improve placement (so val < win hurts)
            diff = val - win
            if direction > 0:
                impact = diff * imp
            else:
                impact = -diff * imp

            impacts.append((f, val, win, float(impact)))

        impacts.sort(key=lambda t: t[3], reverse=True)  # most positive = hurts most
        hurt = [t for t in impacts if t[3] > 0][:top_k]
        help_ = list(reversed([t for t in impacts if t[3] < 0][-top_k:]))

        explanations.append(
            PlayerExplanation(
                player=str(row["Player"]),
                predicted_exp_place=float(row["Predicted_ExpPlace"]),
                top_hurt=hurt,
                top_help=help_,
            )
        )

    explanations.sort(key=lambda e: e.predicted_exp_place)
    return pod_df, importances, explanations


def main() -> None:
    ap = argparse.ArgumentParser(description="Explain one pod's prediction (feature impacts + weights).")
    ap.add_argument("--year", required=True)
    ap.add_argument("--week", required=True)
    ap.add_argument("--game", required=True)
    ap.add_argument("--pod", default=None, help="PodId (optional). If omitted, explains all pods matching year/week/game.")
    ap.add_argument("--mode", choices=["inseason", "preseason"], default="inseason")
    ap.add_argument("--top", type=int, default=6, help="How many top hurting/helping features to show per player.")
    args = ap.parse_args()

    df = _load_df()

    pod_df_or_available, importances, explanations = explain_pod(
        df=df,
        year=args.year,
        week=args.week,
        game=args.game,
        pod_id=args.pod,
        mode=args.mode,
        top_k=int(args.top),
        seed=42,
    )

    if not explanations:
        print("No matching future pod found.")
        print("")
        print("Available future pods:")
        if isinstance(pod_df_or_available, pd.DataFrame) and not pod_df_or_available.empty:
            for _, r in pod_df_or_available.iterrows():
                print(f"- {r['Year']} {r['Week']} {r['Game']} ({r['PodId']}) rows={r['rows']}")
        return

    pod_df = pod_df_or_available  # type: ignore[assignment]
    pod_id = str(pod_df["PodId"].iloc[0]) if "PodId" in pod_df.columns else "(unknown)"

    print("\n" + "=" * 70)
    print("POD EXPLANATION (RandomForest expected placement)")
    print("=" * 70)
    print(f"Pod: {args.year} {args.week} {args.game} ({pod_id})")
    print("")

    print("Global feature weights (RandomForest feature_importances_):")
    for feat, w in importances.head(12).items():
        print(f"- {feat:20s} {w:0.4f}")
    print("")

    for e in explanations:
        print("-" * 70)
        print(f"{e.player}: predicted expected placement = {e.predicted_exp_place:0.2f} (lower is better)")
        print("")

        print("Top factors HURTING (pushing placement worse):")
        for feat, val, win, impact in e.top_hurt:
            print(f"  - {feat:20s} val={val:0.3f}  winner_avg={win:0.3f}  impact={impact:0.4f}")
        if not e.top_hurt:
            print("  (none)")
        print("")

        print("Top factors HELPING (pushing placement better):")
        for feat, val, win, impact in e.top_help:
            print(f"  - {feat:20s} val={val:0.3f}  winner_avg={win:0.3f}  impact={impact:0.4f}")
        if not e.top_help:
            print("  (none)")
        print("")


if __name__ == "__main__":
    main()

