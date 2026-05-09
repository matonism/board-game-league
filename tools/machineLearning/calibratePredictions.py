"""
Walk-forward calibration for the RF + Plackett–Luce path (predictUpcoming.py).

Trains only on games strictly before each held-out pod's week (same calendar week
excluded). Reports MAE on expected placement, Brier score for win (1st place),
and log loss for the winner identity.
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from predictUpcoming import (  # noqa: E402
    FEATURES_INSEASON,
    FEATURES_PRESEASON,
    _sample_plackett_luce,
)


_LOG_FIELDS = [
    "timestamp_utc",
    "run_label",
    "data_file",
    "mode",
    "seed",
    "sims",
    "temperature",
    "n_estimators",
    "min_train_rows",
    "max_pods",
    "drop_features",
    "pods_evaluated",
    "skipped",
    "mean_mae",
    "mean_brier",
    "mean_logloss",
]


def _append_calibration_log(log_path: Path, row: Dict[str, object]) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    new_file = not log_path.exists()
    with log_path.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=_LOG_FIELDS, extrasaction="ignore")
        if new_file:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in _LOG_FIELDS})


def _mc_first_probs(
    players: List[str],
    strengths: Dict[str, float],
    n_sims: int,
    temperature: float,
) -> Dict[str, float]:
    first_counts = {p: 0 for p in players}
    for _ in range(int(n_sims)):
        order = _sample_plackett_luce(players, strengths, temperature=temperature)
        first_counts[order[0]] += 1
    return {p: first_counts[p] / n_sims for p in players}


def main() -> None:
    default_data = _ROOT / "bgl_ml_features.json"
    parser = argparse.ArgumentParser(description="Walk-forward calibration for predictUpcoming RF model.")
    parser.add_argument("--data", type=Path, default=default_data)
    parser.add_argument("--mode", choices=("inseason", "preseason"), default="inseason")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--sims", type=int, default=5000, help="MC sims per pod (keep moderate for runtime)")
    parser.add_argument("--temperature", type=float, default=0.50)
    parser.add_argument("--n-estimators", type=int, default=150, metavar="N", help="RF trees (lower = faster)")
    parser.add_argument("--min-train-rows", type=int, default=80, help="Skip pod if fewer training rows")
    parser.add_argument("--max-pods", type=int, default=0, help="Cap pods evaluated (0 = no cap)")
    parser.add_argument(
        "--log",
        type=Path,
        default=None,
        metavar="FILE.csv",
        help="Append this run's metrics as one CSV row (create file + header if missing).",
    )
    parser.add_argument(
        "--progress-every",
        type=int,
        default=25,
        metavar="N",
        help="Print progress every N successfully evaluated pods (0 disables).",
    )
    parser.add_argument(
        "--drop-features",
        type=str,
        default="",
        metavar="NAMES",
        help="Comma-separated feature columns to omit (e.g. FamiliarGame for ablations).",
    )
    parser.add_argument(
        "--run-label",
        type=str,
        default="",
        metavar="TEXT",
        help="Optional tag stored in --log CSV so runs are easy to compare.",
    )
    args = parser.parse_args()

    df = pd.read_json(args.data)
    completed = df.dropna(subset=["Placement"]).copy()
    if completed.empty:
        print("No completed games with Placement in dataset.")
        return

    completed["Placement"] = pd.to_numeric(completed["Placement"])
    completed["YearInt"] = pd.to_numeric(completed["Year"], errors="coerce").fillna(-1).astype(int)
    completed["WN"] = pd.to_numeric(completed["WeekNum"], errors="coerce")

    feats = list(FEATURES_INSEASON if args.mode == "inseason" else FEATURES_PRESEASON)
    if args.drop_features.strip():
        drop = {x.strip() for x in args.drop_features.split(",") if x.strip()}
        unknown = drop - set(feats)
        if unknown:
            print(f"Warning: --drop-features not in current feature set (ignored): {sorted(unknown)}")
        feats = [f for f in feats if f not in drop]
    if not feats:
        print("No features left after --drop-features.")
        return
    missing_df = [f for f in feats if f not in df.columns]
    if missing_df:
        print(f"Dataset missing columns: {missing_df}")
        return

    pods = (
        completed.groupby(["Year", "Week", "WeekNum", "Game", "PodId"], as_index=False)
        .agg(n=("Player", "count"))
        .sort_values(["Year", "WeekNum", "Game", "PodId"])
    )
    pods["YearInt"] = pd.to_numeric(pods["Year"], errors="coerce").fillna(-1).astype(int)
    pods["WN"] = pd.to_numeric(pods["WeekNum"], errors="coerce")

    pods = pods.sort_values(["YearInt", "WN", "Game", "PodId"])

    if args.max_pods > 0:
        pods = pods.tail(int(args.max_pods))

    slot_total = len(pods)
    if args.max_pods == 0:
        print(
            f"Note: --max-pods not set; evaluating all {slot_total} historical pod slots "
            "(slow: each slot retrains RF + MC). Consider --max-pods 50 for quick trials.\n"
        )

    mae_all: List[float] = []
    brier_all: List[float] = []
    logloss_all: List[float] = []
    skipped = 0
    np.random.seed(args.seed)
    t0 = time.perf_counter()
    evaluated = 0

    for _, prow in pods.iterrows():
        py, pw, pgame, pid = prow["Year"], prow["Week"], prow["Game"], prow["PodId"]
        p_yi = int(prow["YearInt"])
        p_wn = float(prow["WN"])

        train_mask = (completed["YearInt"] < p_yi) | ((completed["YearInt"] == p_yi) & (completed["WN"] < p_wn))
        train_df = completed[train_mask]
        if len(train_df) < args.min_train_rows:
            skipped += 1
            continue

        test_pod = completed[
            (completed["Year"].astype(str) == str(py))
            & (completed["Week"].astype(str) == str(pw))
            & (completed["Game"].astype(str) == str(pgame))
            & (completed["PodId"].astype(str) == str(pid))
        ]
        if len(test_pod) < 2:
            skipped += 1
            continue

        model = RandomForestRegressor(n_estimators=args.n_estimators, random_state=args.seed)
        model.fit(train_df[feats], train_df["Placement"])

        pred = model.predict(test_pod[feats])
        actual = test_pod["Placement"].to_numpy(dtype=float)

        winner_mask = test_pod["Placement"] == test_pod["Placement"].min()
        winners = test_pod.loc[winner_mask, "Player"].tolist()
        if len(winners) != 1:
            skipped += 1
            continue

        mae_all.append(float(np.mean(np.abs(pred - actual))))

        players = test_pod["Player"].tolist()
        exp_place = dict(zip(players, pred.astype(float).tolist()))
        strengths = {p: -float(exp_place[p]) for p in players}

        p_first = _mc_first_probs(players, strengths, n_sims=args.sims, temperature=args.temperature)

        winner = winners[0]

        p_w = float(p_first.get(winner, 0.0))
        p_w = max(p_w, 1e-15)
        brier_all.append((1.0 - p_w) ** 2)
        logloss_all.append(-float(np.log(p_w)))

        evaluated += 1
        if args.progress_every > 0 and evaluated % args.progress_every == 0:
            elapsed = time.perf_counter() - t0
            rate = evaluated / elapsed if elapsed > 0 else 0.0
            print(
                f"  ... {evaluated} pods evaluated in {elapsed / 60.0:.1f} min "
                f"({rate:.2f} pods/s)",
                flush=True,
            )

    n = len(mae_all)
    print("\n" + "=" * 56)
    print("BGL CALIBRATION (walk-forward, RF + Plackett-Luce)")
    if args.run_label:
        print(f"Run label: {args.run_label}")
    if args.drop_features.strip():
        print(f"Dropped features: {args.drop_features.strip()}")
    print("=" * 56)
    print("This simulates the past: for each pod, the model trains only on games")
    print("that already happened before that week, predicts that pod, then compares")
    print("to the real results (no peeking at same-week or future games).")
    print()
    print(f"Pods evaluated: {n}   (skipped: {skipped})")
    if n == 0:
        return

    m_mae = float(np.mean(mae_all))
    print(f"Mean MAE (expected placement): {m_mae:.4f}")
    print(f"Mean Brier (win):            {float(np.mean(brier_all)):.4f}")
    print(f"Mean log loss (winner):      {float(np.mean(logloss_all)):.4f}")

    print(
        "\nWhat these mean (plain English):\n"
        "  - MAE: average gap between predicted finish (e.g. 2.3) and actual (1-4).\n"
        "    On a 4-player pod, ~1.0 means about one spot off per player on average.\n"
        "  - Brier (win): how sharp your winner probabilities were (0 = perfect, lower better).\n"
        "  - Log loss (winner): penalty for being surprised by who won (lower = assigned\n"
        "    more probability to the actual winner)."
    )

    print(
        "\nSetup: training uses only games strictly before each pod's week "
        f"({args.mode} feature set); same-week rows are excluded."
    )

    if args.log is not None:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        _append_calibration_log(
            args.log,
            {
                "timestamp_utc": ts,
                "run_label": args.run_label,
                "data_file": str(args.data.resolve()),
                "mode": args.mode,
                "seed": args.seed,
                "sims": args.sims,
                "temperature": args.temperature,
                "n_estimators": args.n_estimators,
                "min_train_rows": args.min_train_rows,
                "max_pods": args.max_pods,
                "drop_features": args.drop_features.strip(),
                "pods_evaluated": n,
                "skipped": skipped,
                "mean_mae": round(m_mae, 6),
                "mean_brier": round(float(np.mean(brier_all)), 6),
                "mean_logloss": round(float(np.mean(logloss_all)), 6),
            },
        )
        print(f"\nAppended this run to: {args.log.resolve()}")
    print()


if __name__ == "__main__":
    main()
