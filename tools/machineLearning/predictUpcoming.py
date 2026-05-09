import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

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


def _softmax(xs: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    t = max(1e-6, float(temperature))
    zs = xs / t
    zs = zs - np.max(zs)
    e = np.exp(zs)
    return e / np.sum(e)


def _sample_plackett_luce(players: List[str], strengths: Dict[str, float], temperature: float) -> List[str]:
    remaining = list(players)
    order: List[str] = []
    while remaining:
        scores = np.array([strengths[p] for p in remaining], dtype=float)
        probs = _softmax(scores, temperature=temperature)
        pick_idx = int(np.random.choice(len(remaining), p=probs))
        order.append(remaining.pop(pick_idx))
    return order


@dataclass(frozen=True)
class PodPrediction:
    year: str
    week: str
    game: str
    pod_id: str
    expected_place: Dict[str, float]
    p_first: Dict[str, float]
    p_top2: Dict[str, float]


def predict_with_probabilities(
    df: pd.DataFrame,
    mode: str = "inseason",
    n_sims: int = 50000,
    temperature: float = 0.50,
    seed: int = 42,
    *,
    year: Optional[str] = None,
    week: Optional[str] = None,
    game: Optional[str] = None,
    pod_id: Optional[str] = None,
    n_estimators: int = 400,
) -> List[PodPrediction]:
    np.random.seed(seed)

    train_df = df.dropna(subset=["Placement"]).copy()
    future_df = df[df["Placement"].isnull()].copy()
    if future_df.empty:
        return []

    if year is not None:
        future_df = future_df[future_df["Year"].astype(str) == str(year)]
    if week is not None:
        future_df = future_df[future_df["Week"].astype(str) == str(week)]
    if game is not None:
        future_df = future_df[future_df["Game"].astype(str) == str(game)]
    if pod_id is not None:
        future_df = future_df[future_df["PodId"].astype(str) == str(pod_id)]

    if future_df.empty:
        return []

    feats = FEATURES_INSEASON if mode == "inseason" else FEATURES_PRESEASON
    X_train = train_df[feats]
    y_train = train_df["Placement"]

    model = RandomForestRegressor(n_estimators=int(n_estimators), random_state=seed)
    model.fit(X_train, y_train)

    future_df["Predicted_Rank"] = model.predict(future_df[feats])

    pod_preds: List[PodPrediction] = []

    for (year, week, game, pod_id), pod_df in future_df.groupby(["Year", "Week", "Game", "PodId"]):
        players = pod_df["Player"].tolist()
        exp_place = dict(zip(players, pod_df["Predicted_Rank"].astype(float).tolist()))

        # Convert "expected placement" into a strength score.
        # Lower expected placement => higher strength.
        strengths = {p: -float(exp_place[p]) for p in players}

        first_counts = {p: 0 for p in players}
        top2_counts = {p: 0 for p in players}

        for _ in range(int(n_sims)):
            order = _sample_plackett_luce(players, strengths, temperature=temperature)
            first_counts[order[0]] += 1
            if len(order) >= 2:
                top2_counts[order[0]] += 1
                top2_counts[order[1]] += 1
            else:
                top2_counts[order[0]] += 1

        p_first = {p: first_counts[p] / n_sims for p in players}
        p_top2 = {p: top2_counts[p] / n_sims for p in players}

        pod_preds.append(
            PodPrediction(
                year=str(year),
                week=str(week),
                game=str(game),
                pod_id=str(pod_id),
                expected_place=exp_place,
                p_first=p_first,
                p_top2=p_top2,
            )
        )

    return pod_preds


def main() -> None:
    default_data = Path(__file__).resolve().parent / "bgl_ml_features.json"
    parser = argparse.ArgumentParser(description="RF placement + Plackett-Luce probabilities for future pods.")
    parser.add_argument("--data", type=Path, default=default_data, help="Path to bgl_ml_features.json")
    parser.add_argument(
        "--mode",
        choices=("inseason", "preseason"),
        default="inseason",
        help="Feature set: preseason omits season-to-date totals.",
    )
    parser.add_argument("--year", type=str, default=None, help="Only this season (string match on Year)")
    parser.add_argument("--week", type=str, default=None, help="Only this week label (e.g. Championship)")
    parser.add_argument("--game", type=str, default=None, help="Only this game title")
    parser.add_argument("--pod", type=str, default=None, help="Only this PodId")
    parser.add_argument("--sims", type=int, default=50000, help="Monte Carlo draws per pod")
    parser.add_argument("--temperature", type=float, default=0.50, help="Plackett-Luce softmax temperature")
    parser.add_argument("--seed", type=int, default=42, help="RNG + RF random_state")
    parser.add_argument(
        "--n-estimators",
        type=int,
        default=400,
        metavar="N",
        help="RandomForestRegressor trees (default 400)",
    )
    args = parser.parse_args()

    df = pd.read_json(args.data)

    preds = predict_with_probabilities(
        df,
        mode=args.mode,
        n_sims=args.sims,
        temperature=args.temperature,
        seed=args.seed,
        year=args.year,
        week=args.week,
        game=args.game,
        pod_id=args.pod,
        n_estimators=args.n_estimators,
    )
    if not preds:
        print("No future games found to predict.")
        return

    print("\n" + "=" * 52)
    print("BGL PREDICTIONS (WITH PROBABILITIES)")
    print("=" * 52 + "\n")

    for pod in preds:
        print(f"{pod.year} {pod.week}: {pod.game} ({pod.pod_id})")
        print("-" * 52)

        rows: List[Tuple[str, float, float, float]] = []
        for player, exp in pod.expected_place.items():
            rows.append((player, float(exp), float(pod.p_first[player]), float(pod.p_top2[player])))

        rows.sort(key=lambda r: (r[1], -r[2]))

        for i, (player, exp, p1, p2) in enumerate(rows, 1):
            print(f"{i}. {player:10s}  exp={exp:0.2f}   P(1st)={p1:0.1%}   P(top2)={p2:0.1%}")
        print("")


if __name__ == "__main__":
    main()

