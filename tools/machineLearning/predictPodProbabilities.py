"""
Pairwise win-probability model + Plackett–Luce Monte Carlo.

Separate from predictUpcoming.py: trains a logistic model on within-pod pairwise
comparisons (player i beat j) using feature differences, then converts summed
pairwise win probabilities into strengths for the same ordering sampler.

Does not change the default RF pipeline.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from predictUpcoming import (  # noqa: E402
    FEATURES_INSEASON,
    FEATURES_PRESEASON,
    PodPrediction,
    _sample_plackett_luce,
)


def _build_pairwise_xy(
    history_df: pd.DataFrame,
    feats: List[str],
) -> Tuple[np.ndarray, np.ndarray]:
    xs: List[np.ndarray] = []
    ys: List[float] = []
    for _, pod_df in history_df.groupby(["Year", "Week", "Game", "PodId"]):
        pod_df = pod_df.copy()
        pod_df["Placement"] = pd.to_numeric(pod_df["Placement"])
        players = pod_df["Player"].tolist()
        if len(players) < 2:
            continue
        mat = pod_df.set_index("Player")[feats].apply(pd.to_numeric, errors="coerce").to_numpy(dtype=float)
        pmap = {p: i for i, p in enumerate(players)}
        for i, pi in enumerate(players):
            for j, pj in enumerate(players):
                if i >= j:
                    continue
                diff = mat[pmap[pi]] - mat[pmap[pj]]
                pi_place = float(pod_df.loc[pod_df["Player"] == pi, "Placement"].iloc[0])
                pj_place = float(pod_df.loc[pod_df["Player"] == pj, "Placement"].iloc[0])
                # Better placement = lower number.
                if pi_place < pj_place:
                    xs.append(diff)
                    ys.append(1.0)
                elif pi_place > pj_place:
                    xs.append(diff)
                    ys.append(0.0)
    if not xs:
        return np.zeros((0, len(feats))), np.array([])
    return np.stack(xs), np.array(ys)


def _pairwise_strengths(
    clf: LogisticRegression,
    pod_df: pd.DataFrame,
    feats: List[str],
) -> Dict[str, float]:
    players = pod_df["Player"].tolist()
    mat = pod_df.set_index("Player")[feats].apply(pd.to_numeric, errors="coerce").to_numpy(dtype=float)
    pmap = {p: i for i, p in enumerate(players)}
    strength: Dict[str, float] = {p: 0.0 for p in players}
    for i, pi in enumerate(players):
        acc = 0.0
        for j, pj in enumerate(players):
            if i == j:
                continue
            diff = (mat[pmap[pi]] - mat[pmap[pj]]).reshape(1, -1)
            proba = clf.predict_proba(diff)[0, 1]
            acc += float(proba)
        strength[pi] = acc
    return strength


def predict_pairwise_pods(
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
    max_iter: int = 2000,
) -> Tuple[List[PodPrediction], Optional[LogisticRegression]]:
    np.random.seed(seed)

    history_df = df.dropna(subset=["Placement"]).copy()
    future_df = df[df["Placement"].isnull()].copy()
    if future_df.empty:
        return [], None

    if year is not None:
        future_df = future_df[future_df["Year"].astype(str) == str(year)]
    if week is not None:
        future_df = future_df[future_df["Week"].astype(str) == str(week)]
    if game is not None:
        future_df = future_df[future_df["Game"].astype(str) == str(game)]
    if pod_id is not None:
        future_df = future_df[future_df["PodId"].astype(str) == str(pod_id)]

    if future_df.empty:
        return [], None

    feats = FEATURES_INSEASON if mode == "inseason" else FEATURES_PRESEASON
    Xp, yp = _build_pairwise_xy(history_df, feats)
    if len(yp) < 20:
        raise RuntimeError("Not enough pairwise training rows; rebuild dataset or use more history.")

    clf = LogisticRegression(max_iter=max_iter, random_state=seed)
    clf.fit(Xp, yp)

    pod_preds: List[PodPrediction] = []

    for (yy, ww, gg, pid), pod_df in future_df.groupby(["Year", "Week", "Game", "PodId"]):
        players = pod_df["Player"].tolist()
        strengths = _pairwise_strengths(clf, pod_df, feats)

        first_counts = {p: 0 for p in players}
        top2_counts = {p: 0 for p in players}
        rank_sum = {p: 0.0 for p in players}

        for _ in range(int(n_sims)):
            order = _sample_plackett_luce(players, strengths, temperature=temperature)
            first_counts[order[0]] += 1
            if len(order) >= 2:
                top2_counts[order[0]] += 1
                top2_counts[order[1]] += 1
            else:
                top2_counts[order[0]] += 1
            for rank, name in enumerate(order, start=1):
                rank_sum[name] += rank

        n = float(n_sims)
        p_first = {p: first_counts[p] / n for p in players}
        p_top2 = {p: top2_counts[p] / n for p in players}
        exp_place = {p: rank_sum[p] / n for p in players}

        pod_preds.append(
            PodPrediction(
                year=str(yy),
                week=str(ww),
                game=str(gg),
                pod_id=str(pid),
                expected_place=exp_place,
                p_first=p_first,
                p_top2=p_top2,
            )
        )

    return pod_preds, clf


def main() -> None:
    default_data = _ROOT / "bgl_ml_features.json"
    parser = argparse.ArgumentParser(description="Pairwise logistic + Plackett–Luce probabilities.")
    parser.add_argument("--data", type=Path, default=default_data)
    parser.add_argument("--mode", choices=("inseason", "preseason"), default="inseason")
    parser.add_argument("--year", type=str, default=None)
    parser.add_argument("--week", type=str, default=None)
    parser.add_argument("--game", type=str, default=None)
    parser.add_argument("--pod", type=str, default=None)
    parser.add_argument("--sims", type=int, default=50000)
    parser.add_argument("--temperature", type=float, default=0.50)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-iter", type=int, default=2000, dest="max_iter")
    args = parser.parse_args()

    df = pd.read_json(args.data)
    preds, _ = predict_pairwise_pods(
        df,
        mode=args.mode,
        n_sims=args.sims,
        temperature=args.temperature,
        seed=args.seed,
        year=args.year,
        week=args.week,
        game=args.game,
        pod_id=args.pod,
        max_iter=args.max_iter,
    )

    if not preds:
        print("No future games found to predict.")
        return

    print("\n" + "=" * 52)
    print("BGL PREDICTIONS (PAIRWISE LOGISTIC + MC)")
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
        print()


if __name__ == "__main__":
    main()
