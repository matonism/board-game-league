from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd


PLACEMENT_TO_POINTS = {1: 3.0, 2: 2.0, 3: 1.0, 4: 0.0}


def _jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    sa = set(a)
    sb = set(b)
    if not sa and not sb:
        return 0.0
    inter = len(sa.intersection(sb))
    union = len(sa.union(sb))
    return inter / union if union else 0.0


def _load_game_summaries(path: Path) -> Dict[str, dict]:
    # `GameSummaries.txt` is a JSON object keyed by game name.
    return pd.read_json(path).to_dict()


def _get_mechanics(summaries: Dict[str, dict], game: str) -> List[str]:
    info = summaries.get(game, {}) or {}
    mechs = info.get("mechanics", []) if isinstance(info, dict) else []
    if not isinstance(mechs, list):
        return []
    return [str(m) for m in mechs]


def _similar_games(
    summaries: Dict[str, dict],
    game: str,
    top_n: int = 12,
    min_sim: float = 0.10,
) -> List[Tuple[str, float]]:
    tgt = _get_mechanics(summaries, game)
    sims: List[Tuple[str, float]] = []
    for g in summaries.keys():
        if g == game:
            continue
        s = _jaccard(tgt, _get_mechanics(summaries, g))
        if s >= min_sim:
            sims.append((g, s))
    sims.sort(key=lambda t: t[1], reverse=True)
    return sims[:top_n]


def _player_points_for_games(hist: pd.DataFrame, player: str, games: List[str]) -> Tuple[float, int]:
    dfp = hist[(hist["Player"] == player) & (hist["Game"].isin(games))]
    if dfp.empty:
        return 1.5, 0  # neutral fallback
    return float(dfp["Points"].mean()), int(len(dfp))


def main() -> None:
    ap = argparse.ArgumentParser(description="Report who should be good at an upcoming game.")
    ap.add_argument("--game", default="Wyrmspan")
    ap.add_argument("--year", default="2026")
    ap.add_argument("--week", default="Championship")
    ap.add_argument("--top-similar", type=int, default=10)
    args = ap.parse_args()

    tools_dir = Path(__file__).resolve().parents[1]
    features_path = tools_dir / "machineLearning" / "bgl_ml_features.json"
    summaries_path = tools_dir / "output" / "GameSummaries.txt"

    df = pd.read_json(features_path)
    summaries = _load_game_summaries(summaries_path)

    # Historical results with points
    hist = df.dropna(subset=["Placement"]).copy()
    hist["Placement"] = pd.to_numeric(hist["Placement"])
    hist["Points"] = hist["Placement"].map(lambda p: PLACEMENT_TO_POINTS.get(int(p), 0.0))

    # Target pod players (future rows)
    future = df[
        (df["Year"].astype(str) == str(args.year))
        & (df["Week"].astype(str) == str(args.week))
        & (df["Game"].astype(str) == str(args.game))
        & (df["Placement"].isnull())
    ]
    players = future["Player"].tolist()
    if not players:
        # fallback: report on everyone
        players = sorted(hist["Player"].unique().tolist())

    tgt_mechs = _get_mechanics(summaries, args.game)
    sims = _similar_games(summaries, args.game, top_n=args.top_similar, min_sim=0.10)
    sim_games = [g for g, _ in sims]

    print("\n" + "=" * 60)
    print("GAME FIT REPORT (MECHANICS TRANSFER)")
    print("=" * 60)
    print(f"Game: {args.game}")
    print(f"Mechanics ({len(tgt_mechs)}): {', '.join(tgt_mechs) if tgt_mechs else '(none found)'}")
    print("")

    if sims:
        print("Most similar games (by mechanics Jaccard):")
        for g, s in sims:
            print(f"- {g}  (sim={s:0.2f})")
        print("")
    else:
        print("Most similar games: (none found)\n")

    rows: List[Tuple[str, float, int]] = []
    for p in players:
        pts, n = _player_points_for_games(hist, p, sim_games)
        rows.append((p, pts, n))

    # Sort: higher points better; tie-break by sample size
    rows.sort(key=lambda r: (r[1], r[2]), reverse=True)

    print("Player fit (based on performance in similar games):")
    for i, (p, pts, n) in enumerate(rows, 1):
        print(f"{i}. {p:10s}  avg_points={pts:0.2f}  samples={n}")
    print("")


if __name__ == "__main__":
    main()

