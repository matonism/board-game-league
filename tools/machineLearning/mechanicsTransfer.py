from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class TransferResult:
    game: str
    players: List[str]
    player_strength: Dict[str, float]
    expected_place: Dict[str, float]


def _zscore(x: np.ndarray) -> np.ndarray:
    sd = float(np.std(x))
    if sd < 1e-9:
        return x * 0.0
    return (x - float(np.mean(x))) / sd


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def _load_game_mechanics(game_summaries_path: Path) -> Dict[str, List[str]]:
    summaries = pd.read_json(game_summaries_path)
    mapping: Dict[str, List[str]] = {}
    # `GameSummaries.txt` is JSON object: { gameName: { mechanics: [...] , ... } }
    for game_name, info in summaries.items():
        mechs = info.get("mechanics", []) if isinstance(info, dict) else []
        if not isinstance(mechs, list):
            mechs = []
        mapping[str(game_name)] = [str(m) for m in mechs]
    return mapping


def _jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    sa = set(a)
    sb = set(b)
    if not sa and not sb:
        return 0.0
    inter = len(sa.intersection(sb))
    union = len(sa.union(sb))
    return inter / union if union else 0.0


def _build_player_game_matrix(history_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    # Convert placements to "points" (higher is better) to make factorization intuitive.
    placement_to_points = {1: 3.0, 2: 2.0, 3: 1.0, 4: 0.0}
    hist = history_df.dropna(subset=["Placement"]).copy()
    hist["Placement"] = pd.to_numeric(hist["Placement"])
    hist["Points"] = hist["Placement"].map(lambda p: placement_to_points.get(int(p), 0.0))

    # Average points for player/game across all appearances.
    pivot = hist.pivot_table(index="Player", columns="Game", values="Points", aggfunc="mean")
    return pivot, hist


def _matrix_factorize(
    R: np.ndarray,
    mask: np.ndarray,
    k: int = 8,
    lr: float = 0.03,
    reg: float = 0.08,
    steps: int = 1500,
    seed: int = 42,
) -> Tuple[np.ndarray, np.ndarray, float, np.ndarray, np.ndarray]:
    """
    Factorize R ~ mu + bu + bi + U @ V.T using SGD over observed entries.
    R: (n_users, n_items) with NaNs filled as 0
    mask: boolean (n_users, n_items) where True means observed
    """
    rng = np.random.default_rng(seed)
    n_users, n_items = R.shape
    mu = float(np.sum(R[mask]) / np.sum(mask))

    U = 0.1 * rng.standard_normal((n_users, k))
    V = 0.1 * rng.standard_normal((n_items, k))
    bu = np.zeros(n_users, dtype=float)
    bi = np.zeros(n_items, dtype=float)

    obs = np.argwhere(mask)
    for _ in range(int(steps)):
        rng.shuffle(obs)
        for u, i in obs:
            pred = mu + bu[u] + bi[i] + float(np.dot(U[u], V[i]))
            err = R[u, i] - pred

            bu[u] += lr * (err - reg * bu[u])
            bi[i] += lr * (err - reg * bi[i])

            Uu = U[u].copy()
            U[u] += lr * (err * V[i] - reg * U[u])
            V[i] += lr * (err * Uu - reg * V[i])

    return U, V, mu, bu, bi


def _synthesize_game_vector(
    target_game: str,
    all_games: List[str],
    game_mechanics: Dict[str, List[str]],
    V: np.ndarray,
    game_index: Dict[str, int],
    top_n: int = 20,
) -> np.ndarray:
    tgt = game_mechanics.get(target_game, [])
    sims: List[Tuple[str, float]] = []
    for g in all_games:
        if g == target_game:
            continue
        s = _jaccard(tgt, game_mechanics.get(g, []))
        if s > 0:
            sims.append((g, s))
    sims.sort(key=lambda t: t[1], reverse=True)
    sims = sims[:top_n]

    if not sims:
        # fallback: mean game vector
        return np.mean(V, axis=0)

    weights = np.array([s for _, s in sims], dtype=float)
    weights = weights / np.sum(weights)
    vecs = np.stack([V[game_index[g]] for g, _ in sims], axis=0)
    return np.sum(vecs * weights[:, None], axis=0)


def predict_championship_transfer(
    features_path: Path,
    game_summaries_path: Path,
    target_year: str = "2026",
    target_week: str = "Championship",
    target_game: str = "Wyrmspan",
) -> TransferResult:
    df = pd.read_json(features_path)
    mechanics = _load_game_mechanics(game_summaries_path)

    history_df = df.dropna(subset=["Placement"]).copy()
    pivot, hist = _build_player_game_matrix(history_df)

    players = list(pivot.index)
    games = list(pivot.columns)

    R = pivot.to_numpy()
    mask = ~np.isnan(R)
    R_filled = np.where(mask, R, 0.0)

    U, V, mu, bu, bi = _matrix_factorize(R_filled, mask, k=10, lr=0.035, reg=0.10, steps=1800, seed=42)

    player_index = {p: idx for idx, p in enumerate(players)}
    game_index = {g: idx for idx, g in enumerate(games)}

    # Build target pod from "future rows"
    # Note: Year is stored as string in the JSON dataset.
    future = df[
        (df["Year"].astype(str) == str(target_year))
        & (df["Week"].astype(str) == str(target_week))
        & (df["Game"].astype(str) == str(target_game))
        & (df["Placement"].isnull())
    ]
    pod_players = future["Player"].tolist()
    if not pod_players:
        raise RuntimeError(f"No future rows found for {target_year} {target_week} {target_game}.")

    # If this game has never been played historically, synthesize a vector from similar mechanics.
    if target_game in game_index:
        v_game = V[game_index[target_game]]
        game_bias = bi[game_index[target_game]]
    else:
        v_game = _synthesize_game_vector(target_game, games, mechanics, V, game_index, top_n=20)
        # bias fallback to mean
        game_bias = float(np.mean(bi))

    # Predict expected "points" then convert to placement-like expectation.
    # Points scale is [0..3]. We'll map to expected placement roughly: placement ≈ 4 - points.
    strengths: Dict[str, float] = {}
    expected_place: Dict[str, float] = {}

    for p in pod_players:
        if p not in player_index:
            # brand-new player fallback: average
            strengths[p] = mu + float(np.mean(bu))
            expected_place[p] = 2.5
            continue

        u = player_index[p]
        pred_points = mu + bu[u] + game_bias + float(np.dot(U[u], v_game))
        strengths[p] = float(pred_points)

        # Placement-ish expectation: higher points => lower placement number
        expected_place[p] = float(np.clip(4.0 - pred_points, 1.0, 4.0))

    return TransferResult(
        game=target_game,
        players=pod_players,
        player_strength=strengths,
        expected_place=expected_place,
    )


def main() -> None:
    root = Path(__file__).resolve().parents[1]  # tools/
    features_path = root / "machineLearning" / "bgl_ml_features.json"
    summaries_path = root / "output" / "GameSummaries.txt"

    res = predict_championship_transfer(features_path, summaries_path)

    print("\n" + "=" * 52)
    print("MECHANICS TRANSFER (GAME-TO-GAME GENERALIZATION)")
    print("=" * 52 + "\n")
    print(f"Game: {res.game}")
    print("")

    rows = [(p, res.expected_place[p], res.player_strength[p]) for p in res.players]
    rows.sort(key=lambda r: r[1])
    for i, (p, exp_place, strength) in enumerate(rows, 1):
        print(f"{i}. {p:10s}  exp_place~{exp_place:0.2f}  (latent_strength={strength:0.2f})")
    print("")


if __name__ == "__main__":
    main()

