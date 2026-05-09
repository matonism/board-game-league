from __future__ import annotations

import argparse
import html
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

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


LABELS: Dict[str, str] = {
    "Difficulty": "Game complexity (BGG weight)",
    "FamiliarGame": "League has played this title before (this season or earlier)",
    "IsHome": "Home-field advantage",
    "CareerAvg": "Career average placement",
    "Tenure": "Games played (experience)",
    "TenureGap": "Experience gap vs opponents",
    "Elo": "Player rating (Elo)",
    "EloGames": "Elo sample size",
    "OppAvgElo": "Opponent Elo (avg)",
    "OppStdElo": "Opponent Elo (spread)",
    "OppMaxElo": "Opponent Elo (max)",
    "PrevGame": "Last result",
    "Prev2Avg": "Recent form (last 2 avg)",
    "WinStreak": "Current win streak",
    "NoLastStreak": "Streak of not finishing last",
    "SecondStreak": "Current 2nd-place streak",
    "ThirdStreak": "Current 3rd-place streak",
    "PlayoffAppearances": "Post-season experience",
    "LastSeasonAvg": "Last season average placement",
    "H2H_WinRate": "Head-to-head win rate vs pod",
    "SeasonPPG": "Season points per game",
    "SeasonAdjPPG": "SOS-adjusted season PPG",
    "PointsAbovePace": "Points above qualifying pace",
    "SeasonSOS": "Strength of schedule (lower = tougher)",
    "CurrentOppAvg": "Opponent strength in this pod",
    "CurrentOppStd": "Opponent strength spread",
    "CurrentOppMin": "Weakest opponent (avg)",
    "CurrentOppMax": "Strongest opponent (avg)",
    "MechanicSkill": "Skill on similar mechanics",
    "MechanicSkillSamples": "Mechanic skill sample size",
    "CategorySkill": "Skill on similar categories",
    "CategorySkillSamples": "Category skill sample size",
    "Consistency_StdDev": "Consistency (lower is steadier)",
    "LastTitlePlacement": "Last time playing this game",
    "IsRookie": "Rookie flag",
    "RookieOpponents": "Number of rookies in pod",
    "ComplexityDelta": "Game vs preferred complexity",
}


TOOLTIPS: Dict[str, str] = {
    "Difficulty": "BoardGameGeek weight for the game. Higher usually means more complex decisions.",
    "FamiliarGame": "1 if this exact game title already finished at least one pod in an earlier week (any season); 0 on the league's first week with that title. Updated after weeks with results.",
    "IsHome": "1 if the game location string contains the player's name, else 0. This is a rough proxy for home advantage.",
    "CareerAvg": "Average placement across all recorded games. Lower is better (1.0 is perfect).",
    "Tenure": "How many recorded games the player has in the dataset, capped at 6 for modeling (after ~1 season, experience stops scaling).",
    "TenureGap": "Player tenure minus the average tenure of opponents in this pod. Positive means more experienced than the pod on average.",
    "Elo": "Elo is a rating system from chess/sports. Everyone starts at 1500. After each game, your rating moves up if you beat higher-rated opponents and down if you lose to lower-rated opponents. We compute it pre-match and only update it after completed games.",
    "EloGames": "How many pairwise Elo updates contributed to the rating (a rough uncertainty proxy).",
    "OppAvgElo": "Average Elo rating of opponents in this pod (pre-match).",
    "OppStdElo": "Spread (std dev) of opponent Elo ratings in this pod.",
    "OppMaxElo": "Highest opponent Elo rating in this pod.",
    "PrevGame": "The player's placement in their most recent prior game (or 2.5 if none).",
    "Prev2Avg": "Average of the player's last two placements (or 2.5 if insufficient history).",
    "WinStreak": "How many consecutive 1st-place finishes entering this game.",
    "NoLastStreak": "How many consecutive games the player avoided last place (4th).",
    "SecondStreak": "How many consecutive 2nd-place finishes entering this game.",
    "ThirdStreak": "How many consecutive 3rd-place finishes entering this game.",
    "PlayoffAppearances": "Count of past post-season games the player has participated in (playoffs + championship).",
    "LastSeasonAvg": "Player average placement during the prior season they played.",
    "H2H_WinRate": "Across historical games, fraction of pairwise matchups vs these opponents where this player's placement beat the opponent's.",
    "SeasonPPG": "Average points per game this season so far using 3/2/1/0 scoring (1st/2nd/3rd/4th).",
    "SeasonAdjPPG": "Heuristic adjustment to SeasonPPG that slightly boosts players who faced tougher schedules (lower SeasonSOS).",
    "PointsAbovePace": "SeasonPoints minus (gamesPlayed * targetPPG). TargetPPG depends on how hard it is to qualify that season.",
    "SeasonSOS": "Average opponent strength faced so far this season (based on opponents' historical averages).",
    "CurrentOppAvg": "Average historical strength of the opponents in this specific pod.",
    "CurrentOppStd": "Standard deviation of opponents' historical average placements (spread in opponent quality).",
    "CurrentOppMin": "Best (lowest) opponent career average in this pod.",
    "CurrentOppMax": "Worst (highest) opponent career average in this pod.",
    "MechanicSkill": "Average placement the player tends to earn on mechanics similar to this game (estimated from their mechanic history). Lower is better.",
    "MechanicSkillSamples": "How many mechanics had prior history for this player (higher = more reliable mechanic skill).",
    "CategorySkill": "Average placement the player tends to earn in BGG categories similar to this game. Lower is better.",
    "CategorySkillSamples": "How many categories had prior history for this player (higher = more reliable category skill).",
    "Consistency_StdDev": "Standard deviation of placements. Lower means more consistent outcomes.",
    "LastTitlePlacement": "Player’s last placement the last time they played THIS exact game (or 2.5 if never).",
    "IsRookie": "1 if player has fewer than ROOKIE_THRESHOLD total games in the dataset.",
    "RookieOpponents": "How many opponents in the pod are rookies (few recorded games).",
    "ComplexityDelta": "Game difficulty minus the average difficulty of games the player wins. Positive means the game is harder than their typical winning comfort zone.",
}


def _esc(s: object) -> str:
    return html.escape(str(s))


def _load_features_df() -> pd.DataFrame:
    return pd.read_json(Path(__file__).resolve().parent / "bgl_ml_features.json")


def _load_game_summaries() -> Dict[str, dict]:
    tools_dir = Path(__file__).resolve().parents[1]
    summaries_path = tools_dir / "output" / "GameSummaries.txt"
    # JSON object keyed by game name
    return pd.read_json(summaries_path).to_dict()


def _get_mechanics(summaries: Dict[str, dict], game: str) -> List[str]:
    info = summaries.get(game, {}) or {}
    mechs = info.get("mechanics", []) if isinstance(info, dict) else []
    if not isinstance(mechs, list):
        return []
    return [str(m) for m in mechs]


def _jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    sa = set(a)
    sb = set(b)
    if not sa and not sb:
        return 0.0
    inter = len(sa.intersection(sb))
    union = len(sa.union(sb))
    return inter / union if union else 0.0


def _similar_games(summaries: Dict[str, dict], game: str, top_n: int = 10) -> List[Tuple[str, float]]:
    tgt = _get_mechanics(summaries, game)
    sims: List[Tuple[str, float]] = []
    for g in summaries.keys():
        if g == game:
            continue
        s = _jaccard(tgt, _get_mechanics(summaries, g))
        if s > 0:
            sims.append((g, s))
    sims.sort(key=lambda t: t[1], reverse=True)
    return sims[:top_n]


def _train_rf(history_df: pd.DataFrame, seed: int = 42) -> Tuple[RandomForestRegressor, pd.Series]:
    # Training feature set is chosen in `_explain_pod`
    X = history_df[FEATURES_INSEASON]
    y = pd.to_numeric(history_df["Placement"])
    model = RandomForestRegressor(n_estimators=400, random_state=seed)
    model.fit(X, y)
    importances = pd.Series(model.feature_importances_, index=FEATURES_INSEASON).sort_values(ascending=False)
    return model, importances


def _feature_directions(history_df: pd.DataFrame, features: List[str]) -> Dict[str, float]:
    dirs: Dict[str, float] = {}
    y = pd.to_numeric(history_df["Placement"])
    for f in features:
        dirs[f] = float(pd.to_numeric(history_df[f]).corr(y))
    return dirs


def _baseline_profile(pod_df: pd.DataFrame, features: List[str]) -> pd.Series:
    # Pod-average baseline (more interpretable than global-winner baseline).
    return pod_df[features].mean()


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
class PlayerExpl:
    player: str
    exp_place: float
    p_first: float
    p_top2: float
    hurts: List[Tuple[str, float, float, float]]
    helps: List[Tuple[str, float, float, float]]


def _explain_pod(
    df: pd.DataFrame,
    year: str,
    week: str,
    game: str,
    pod_id: Optional[str],
    mode: str,
    n_sims: int,
    temperature: float,
    seed: int = 42,
    top_k: int = 8,
) -> Tuple[str, List[PlayerExpl], pd.Series]:
    np.random.seed(seed)

    history_df = df.dropna(subset=["Placement"]).copy()
    future_df = df[df["Placement"].isnull()].copy()
    features = FEATURES_INSEASON if mode == "inseason" else FEATURES_PRESEASON
    X = history_df[features]
    y = pd.to_numeric(history_df["Placement"])
    model = RandomForestRegressor(n_estimators=400, random_state=seed)
    model.fit(X, y)
    importances = pd.Series(model.feature_importances_, index=features).sort_values(ascending=False)
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
        raise RuntimeError("No matching future pod found.")

    resolved_pod_id = str(pod_df["PodId"].iloc[0]) if "PodId" in pod_df.columns else ""
    pod_df["ExpPlace"] = model.predict(pod_df[features])
    baseline_prof = _baseline_profile(pod_df, features)

    players = pod_df["Player"].tolist()
    exp_place = {p: float(v) for p, v in zip(players, pod_df["ExpPlace"].tolist())}
    strengths = {p: -exp_place[p] for p in players}

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

    expls: List[PlayerExpl] = []
    for _, row in pod_df.iterrows():
        impacts: List[Tuple[str, float, float, float]] = []
        for f in features:
            val = float(row[f])
            win = float(baseline_prof[f])
            imp = float(importances.get(f, 0.0))
            direction = float(directions.get(f, 0.0))
            diff = val - win
            if direction > 0:
                impact = diff * imp
            else:
                impact = -diff * imp
            impacts.append((f, val, win, float(impact)))

        impacts.sort(key=lambda t: t[3], reverse=True)
        hurts = [t for t in impacts if t[3] > 0][:top_k]
        helps = list(reversed([t for t in impacts if t[3] < 0][-top_k:]))

        pl = str(row["Player"])
        expls.append(
            PlayerExpl(
                player=pl,
                exp_place=float(row["ExpPlace"]),
                p_first=float(p_first[pl]),
                p_top2=float(p_top2[pl]),
                hurts=hurts,
                helps=helps,
            )
        )

    expls.sort(key=lambda e: e.exp_place)
    return resolved_pod_id, expls, importances


def _render_report(
    title: str,
    context: Dict[str, str],
    mechanics: List[str],
    similar_games: List[Tuple[str, float]],
    importances: pd.Series,
    players: List[PlayerExpl],
    out_path: Path,
) -> None:
    # Build a small tooltip glossary payload for JS
    glossary_payload = {
        f: {
            "label": LABELS.get(f, f),
            "tooltip": TOOLTIPS.get(f, ""),
        }
        for f in sorted(set(FEATURES_INSEASON).union(FEATURES_PRESEASON))
    }

    def badge(label: str) -> str:
        return f'<span class="badge">{_esc(label)}</span>'

    # Sections
    mechanics_html = (
        "".join(f'<span class="chip">{_esc(m)}</span>' for m in mechanics)
        if mechanics
        else '<span class="muted">(No mechanics found in GameSummaries)</span>'
    )

    similar_html = ""
    if similar_games:
        rows = []
        for g, s in similar_games:
            rows.append(
                f"<tr><td>{_esc(g)}</td><td class='num'>{s:0.2f}</td></tr>"
            )
        similar_html = (
            "<table class='table'>"
            "<thead><tr><th>Game</th><th class='num'>Similarity</th></tr></thead>"
            "<tbody>"
            + "".join(rows)
            + "</tbody></table>"
        )
    else:
        similar_html = "<div class='muted'>(No similar games found.)</div>"

    importance_rows = []
    for feat, w in importances.items():
        importance_rows.append(
            "<tr>"
            f"<td><button class='link' data-feature='{_esc(feat)}'>{_esc(LABELS.get(feat, feat))}</button></td>"
            f"<td class='mono muted'>{_esc(feat)}</td>"
            f"<td class='num'>{float(w):0.4f}</td>"
            "</tr>"
        )

    players_cards = []
    for p in players:
        hurts_rows = []
        for feat, val, win, impact in p.hurts:
            hurts_rows.append(
                "<tr>"
                f"<td><button class='link' data-feature='{_esc(feat)}'>{_esc(LABELS.get(feat, feat))}</button></td>"
                f"<td class='num mono'>{val:0.3f}</td>"
                f"<td class='num mono muted'>{win:0.3f}</td>"
                f"<td class='num mono bad'>+{impact:0.4f}</td>"
                "</tr>"
            )
        helps_rows = []
        for feat, val, win, impact in p.helps:
            helps_rows.append(
                "<tr>"
                f"<td><button class='link' data-feature='{_esc(feat)}'>{_esc(LABELS.get(feat, feat))}</button></td>"
                f"<td class='num mono'>{val:0.3f}</td>"
                f"<td class='num mono muted'>{win:0.3f}</td>"
                f"<td class='num mono good'>{impact:0.4f}</td>"
                "</tr>"
            )

        players_cards.append(
            f"""
            <section class="card">
              <div class="cardHeader">
                <div>
                  <div class="titleRow">
                    <h3>{_esc(p.player)}</h3>
                    {badge(f"exp place {p.exp_place:0.2f}")}
                  </div>
                  <div class="subRow">
                    <span class="pill">P(1st): <b>{p.p_first:0.1%}</b></span>
                    <span class="pill">P(top2): <b>{p.p_top2:0.1%}</b></span>
                  </div>
                </div>
              </div>

              <div class="grid2">
                <div>
                  <h4>Hurting odds</h4>
                  <div class="muted small">Biggest positive “impact” values push expected placement worse.</div>
                  <div class="tableWrap">
                    <table class="table compact">
                      <thead>
                        <tr><th>Factor</th><th class="num">Value</th><th class="num">Avg winner</th><th class="num">Impact</th></tr>
                      </thead>
                      <tbody>
                        {''.join(hurts_rows) if hurts_rows else "<tr><td colspan='4' class='muted'>(none)</td></tr>"}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h4>Helping odds</h4>
                  <div class="muted small">Most negative “impact” values push expected placement better.</div>
                  <div class="tableWrap">
                    <table class="table compact">
                      <thead>
                        <tr><th>Factor</th><th class="num">Value</th><th class="num">Avg winner</th><th class="num">Impact</th></tr>
                      </thead>
                      <tbody>
                        {''.join(helps_rows) if helps_rows else "<tr><td colspan='4' class='muted'>(none)</td></tr>"}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
            """
        )

    context_kv = "".join(
        f"<div class='kv'><div class='k'>{_esc(k)}</div><div class='v'>{_esc(v)}</div></div>"
        for k, v in context.items()
    )

    html_doc = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{_esc(title)}</title>
  <style>
    :root {{
      --bg: #0b0f17;
      --panel: rgba(255,255,255,0.06);
      --panel2: rgba(255,255,255,0.08);
      --text: rgba(255,255,255,0.92);
      --muted: rgba(255,255,255,0.65);
      --muted2: rgba(255,255,255,0.5);
      --border: rgba(255,255,255,0.12);
      --good: #2dd4bf;
      --bad: #fb7185;
      --accent: #60a5fa;
      --shadow: 0 18px 60px rgba(0,0,0,0.45);
      --radius: 16px;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: var(--sans);
      color: var(--text);
      background:
        radial-gradient(1200px 600px at 20% 0%, rgba(96,165,250,0.22), transparent 60%),
        radial-gradient(900px 500px at 70% 10%, rgba(45,212,191,0.14), transparent 60%),
        radial-gradient(800px 420px at 50% 100%, rgba(251,113,133,0.10), transparent 60%),
        var(--bg);
    }}
    a {{ color: var(--accent); }}
    .wrap {{ max-width: 1100px; margin: 0 auto; padding: 28px 18px 60px; }}
    .tabs {{
      margin-top: 14px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }}
    .tab {{
      appearance: none;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.88);
      padding: 8px 12px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }}
    .tab:hover {{ background: rgba(255,255,255,0.08); }}
    .tab.active {{
      background: rgba(96,165,250,0.18);
      border-color: rgba(96,165,250,0.30);
      color: rgba(255,255,255,0.95);
    }}
    .tabPanel {{ display: none; }}
    .tabPanel.active {{ display: block; }}
    .hero {{
      background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 18px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }}
    .heroTop {{ display:flex; gap: 14px; align-items: baseline; justify-content: space-between; flex-wrap: wrap; }}
    h1 {{ font-size: 22px; margin: 0; letter-spacing: 0.2px; }}
    .muted {{ color: var(--muted); }}
    .muted2 {{ color: var(--muted2); }}
    .small {{ font-size: 12px; }}
    .mono {{ font-family: var(--mono); }}
    .grid {{ display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; margin-top: 14px; }}
    @media (max-width: 960px) {{ .grid {{ grid-template-columns: 1fr; }} }}
    .panel {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 14px;
    }}
    .kvs {{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
    @media (max-width: 640px) {{ .kvs {{ grid-template-columns: 1fr; }} }}
    .kv {{ display:flex; gap: 10px; align-items: baseline; padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }}
    .kv .k {{ width: 120px; color: var(--muted); font-size: 12px; }}
    .kv .v {{ flex: 1; font-weight: 600; }}
    .chips {{ display:flex; flex-wrap: wrap; gap: 8px; }}
    .chip {{
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(96,165,250,0.10);
      border: 1px solid rgba(96,165,250,0.24);
      color: rgba(255,255,255,0.88);
      font-size: 12px;
    }}
    .sectionTitle {{ margin: 20px 0 10px; display:flex; align-items: center; justify-content: space-between; gap: 8px; }}
    .sectionTitle h2 {{ font-size: 16px; margin: 0; }}
    .card {{
      background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 14px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.35);
      margin-top: 14px;
    }}
    .cardHeader {{ display:flex; align-items: center; justify-content: space-between; gap: 10px; }}
    h3 {{ margin: 0; font-size: 16px; }}
    h4 {{ margin: 0 0 6px; font-size: 13px; color: rgba(255,255,255,0.86); }}
    .titleRow {{ display:flex; align-items: center; gap: 10px; flex-wrap: wrap; }}
    .subRow {{ margin-top: 8px; display:flex; gap: 10px; flex-wrap: wrap; }}
    .pill {{
      display:inline-flex;
      gap: 6px;
      align-items: baseline;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.86);
      font-size: 12px;
    }}
    .badge {{
      display:inline-flex;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(45,212,191,0.12);
      border: 1px solid rgba(45,212,191,0.26);
      color: rgba(255,255,255,0.9);
      font-size: 12px;
      font-weight: 700;
    }}
    .grid2 {{ display:grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px; }}
    @media (max-width: 960px) {{ .grid2 {{ grid-template-columns: 1fr; }} }}
    .tableWrap {{ overflow:auto; border-radius: 14px; border: 1px solid rgba(255,255,255,0.10); }}
    .table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: rgba(0,0,0,0.10);
    }}
    .table th, .table td {{
      padding: 9px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      vertical-align: top;
    }}
    .table th {{
      text-align: left;
      color: rgba(255,255,255,0.78);
      background: rgba(255,255,255,0.04);
      position: sticky;
      top: 0;
      z-index: 1;
    }}
    .table.compact th, .table.compact td {{ padding: 8px 9px; }}
    .num {{ text-align: right; font-variant-numeric: tabular-nums; }}
    .good {{ color: var(--good); font-weight: 700; }}
    .bad {{ color: var(--bad); font-weight: 700; }}
    .link {{
      appearance: none;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.92);
      padding: 0;
      font: inherit;
      cursor: pointer;
      text-decoration: underline;
      text-decoration-color: rgba(96,165,250,0.55);
    }}
    .link:hover {{ color: rgba(96,165,250,0.95); }}

    /* Tooltip */
    .tip {{
      position: fixed;
      inset: auto auto 16px 16px;
      max-width: 420px;
      background: rgba(12,16,26,0.92);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 14px;
      padding: 12px 12px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
      display: none;
      z-index: 1000;
    }}
    .tipHeader {{ display:flex; align-items:flex-start; justify-content: space-between; gap: 10px; }}
    .tipTitle {{ font-weight: 800; }}
    .tipClose {{
      appearance:none; border:none; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.85);
      padding: 6px 9px; border-radius: 10px; cursor:pointer;
    }}
    .tipClose:hover {{ background: rgba(255,255,255,0.10); }}
    .tipBody {{ margin-top: 8px; color: rgba(255,255,255,0.78); line-height: 1.35; }}
    .tipMeta {{ margin-top: 10px; color: rgba(255,255,255,0.62); font-size: 12px; }}
    .footer {{ margin-top: 20px; color: rgba(255,255,255,0.52); font-size: 12px; }}
    .callout {{
      border: 1px dashed rgba(255,255,255,0.18);
      border-radius: 14px;
      padding: 10px 12px;
      background: rgba(255,255,255,0.03);
      color: rgba(255,255,255,0.72);
      font-size: 12px;
      line-height: 1.35;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="heroTop">
        <h1>{_esc(title)}</h1>
        <div class="muted small">Generated from `bgl_ml_features.json`</div>
      </div>
      <div class="tabs" role="tablist" aria-label="Report sections">
        <button class="tab active" role="tab" aria-selected="true" data-tab="overview">Overview</button>
        <button class="tab" role="tab" aria-selected="false" data-tab="weights">Model weights</button>
        <button class="tab" role="tab" aria-selected="false" data-tab="players">Player breakdown</button>
        <button class="tab" role="tab" aria-selected="false" data-tab="method">Methodology</button>
      </div>
    </div>

    <div id="panel-overview" class="tabPanel active" role="tabpanel">
      <div class="grid">
        <div class="panel">
          <div class="sectionTitle"><h2>Context</h2></div>
          <div class="kvs">{context_kv}</div>
          <div style="margin-top: 12px" class="callout">
            <b>How to read this report:</b> Expected placement is the RandomForest output (lower is better).
            Probabilities are from a Monte Carlo simulation that turns expected placement into a “strength” score and samples full finish orders.
            Click any factor name to see a plain-English explanation.
          </div>
        </div>
        <div class="panel">
          <div class="sectionTitle"><h2>Game mechanics</h2></div>
          <div class="chips">{mechanics_html}</div>
          <div class="sectionTitle" style="margin-top: 14px"><h2>Similar games</h2></div>
          {similar_html}
        </div>
      </div>
    </div>

    <div id="panel-weights" class="tabPanel" role="tabpanel">
      <div class="sectionTitle">
        <h2>Model feature weights (global)</h2>
        <div class="muted small">RandomForest `feature_importances_` (not linear coefficients)</div>
      </div>
      <div class="panel">
        <div class="tableWrap">
          <table class="table">
            <thead>
              <tr><th>Factor</th><th>Variable</th><th class="num">Weight</th></tr>
            </thead>
            <tbody>
              {''.join(importance_rows)}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="panel-players" class="tabPanel" role="tabpanel">
      <div class="sectionTitle">
        <h2>Player breakdown</h2>
        <div class="muted small">“Impact” compares player value to pod average, scaled by feature weight</div>
      </div>
      {''.join(players_cards)}
    </div>

    <div id="panel-method" class="tabPanel" role="tabpanel">
      <div class="sectionTitle"><h2>Methodology</h2></div>
      <div class="panel">
        <div class="callout">
          <b>Tenure cap:</b> `Tenure` is capped at <b>6</b> games so experience stops scaling after roughly one season.
          <br/><br/>
          <b>Elo rating:</b> Elo is a pre-match rating system (common in chess/sports). Everyone starts at 1500.
          After each completed game, we apply pairwise updates based on who finished ahead of whom.
          Beating higher-rated opponents increases your Elo more than beating lower-rated opponents.
          <br/><br/>
          <b>Probabilities:</b> We run a Monte Carlo simulation using a Plackett–Luce sampler.
          We convert each player’s expected placement into a “strength” score, then sample finish orders.
          The <b>temperature</b> controls how often favorites win (lower = more confident).
        </div>
        <div class="footer">
          <div><b>Notes:</b></div>
          <ul>
            <li>“Impact” is an interpretability heuristic (gap × importance × direction). It helps explain the model, but it is not the model itself.</li>
            <li>SOS-adjusted PPG and category skill are best-effort heuristics; treat them as signals, not truths.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div id="tip" class="tip" role="dialog" aria-modal="false">
    <div class="tipHeader">
      <div>
        <div id="tipTitle" class="tipTitle"></div>
        <div id="tipVar" class="tipMeta"></div>
      </div>
      <button id="tipClose" class="tipClose">Close</button>
    </div>
    <div id="tipBody" class="tipBody"></div>
  </div>

  <script>
    const GLOSSARY = {json.dumps(glossary_payload)};
    const tip = document.getElementById('tip');
    const tipTitle = document.getElementById('tipTitle');
    const tipVar = document.getElementById('tipVar');
    const tipBody = document.getElementById('tipBody');
    const tipClose = document.getElementById('tipClose');

    function setTab(tab) {{
      document.querySelectorAll('.tab').forEach(b => {{
        const isActive = b.getAttribute('data-tab') === tab;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }});
      document.querySelectorAll('.tabPanel').forEach(p => {{
        p.classList.toggle('active', p.id === `panel-${{tab}}`);
      }});
    }}

    document.addEventListener('click', (e) => {{
      const tabBtn = e.target.closest('.tab[data-tab]');
      if (tabBtn) {{
        setTab(tabBtn.getAttribute('data-tab'));
        return;
      }}
    }});

    function showTip(feature) {{
      const info = GLOSSARY[feature];
      if (!info) return;
      tipTitle.textContent = info.label || feature;
      tipVar.textContent = feature;
      tipBody.textContent = info.tooltip || '';
      tip.style.display = 'block';
    }}

    function hideTip() {{
      tip.style.display = 'none';
    }}

    document.addEventListener('click', (e) => {{
      const el = e.target.closest('[data-feature]');
      if (!el) return;
      e.preventDefault();
      showTip(el.getAttribute('data-feature'));
    }});

    tipClose.addEventListener('click', hideTip);
    document.addEventListener('keydown', (e) => {{
      if (e.key === 'Escape') hideTip();
    }});
  </script>
</body>
</html>
"""

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html_doc, encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description="Generate an HTML report for a single future pod.")
    ap.add_argument("--year", required=True)
    ap.add_argument("--week", required=True)
    ap.add_argument("--game", required=True)
    ap.add_argument("--pod", default=None, help="Optional PodId. If omitted, uses the first matching pod.")
    ap.add_argument("--mode", choices=["inseason", "preseason"], default="inseason")
    ap.add_argument("--sims", type=int, default=50000)
    ap.add_argument("--temperature", type=float, default=0.50)
    ap.add_argument("--out", default=None, help="Output HTML path (optional).")
    args = ap.parse_args()

    df = _load_features_df()
    summaries = _load_game_summaries()

    resolved_pod_id, players, importances = _explain_pod(
        df=df,
        year=str(args.year),
        week=str(args.week),
        game=str(args.game),
        pod_id=args.pod,
        mode=args.mode,
        n_sims=int(args.sims),
        temperature=float(args.temperature),
        seed=42,
        top_k=8,
    )

    mechanics = _get_mechanics(summaries, str(args.game))
    similar = _similar_games(summaries, str(args.game), top_n=10)

    title = f"BGL ML Report — {args.year} {args.week}: {args.game}"
    context = {
        "Year": str(args.year),
        "Week": str(args.week),
        "Game": str(args.game),
        "PodId": resolved_pod_id,
        "Mode": str(args.mode),
        "Prob sims": f"{int(args.sims):,}",
        "Temperature": f"{float(args.temperature):0.2f}",
    }

    default_out = Path(__file__).resolve().parent / "reports" / f"{args.year}_{args.week}_{args.game}_report.html"
    out_path = Path(args.out) if args.out else default_out

    _render_report(
        title=title,
        context=context,
        mechanics=mechanics,
        similar_games=similar,
        importances=importances,
        players=players,
        out_path=out_path,
    )

    print(f"Wrote report: {out_path}")


if __name__ == "__main__":
    main()

