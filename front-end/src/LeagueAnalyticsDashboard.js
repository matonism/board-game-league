import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './PowerRankings.css';
import './LeagueAnalyticsDashboard.css';

function safeId(str) {
    return String(str || '').replace(/[^a-zA-Z0-9]/g, '');
}

/** HTML strings aligned with `generateReports7.js` createCard info tooltips. */
function getBoardTooltipHtml(board) {
    const { category, scope } = board;
    if (category.includes('Consistent') || category.includes('Std Dev')) {
        return '<strong>Standard Deviation</strong> measures consistency. <br>A lower value means the player\'s performance is more predictable/consistent (less variance).';
    }
    if (category.includes('Differential')) {
        return '<strong>(+) Positive:</strong> Better at HOME.<br><strong>(-) Negative:</strong> Better AWAY.';
    }
    if (category.includes('SOS-Adjusted Points per Game')) {
        return '<strong>Completed regular seasons only.</strong><br><br><strong>Adjusted PPG</strong> = Season PPG + (Season SoS - Season baseline opponent strength) × 0.4.<br><br><strong>SoS</strong> here is average opponent points per game (higher = tougher schedule).';
    }
    if (category.includes('Strength of Schedule')) {
        return 'Calculated as the average regular season score of all opponents faced.';
    }
    if (category.includes('Elo Leaderboard')) {
        return '<strong>Elo rating</strong> is a skill rating system used in chess/sports.<br><br>Everyone starts at <strong>1500</strong>. After each table, we do pairwise updates: you gain rating for finishing ahead of higher-rated opponents and lose rating for finishing behind lower-rated opponents.<br><br><strong>Value</strong> is current Elo. Context shows how many pairwise comparisons contributed.';
    }
    if (category.includes('Worst Enemies')) {
        return 'Lowest average score when playing against this specific opponent (Min 3 games).';
    }
    if (category.includes('Best Duo')) {
        return 'Highest combined average score per game when playing at the same table (Min 5 games).';
    }
    if (category.includes('Worst Duo')) {
        return 'Lowest combined average score per game when playing at the same table (same pairing rules as Best Duo).';
    }
    if (category.includes('Hardest Path to Playoffs')) {
        return 'Calculates the toughest strength of schedule for a player that still made playoffs';
    }
    if (category.includes('Tiebreaker Games')) {
        return 'Count of pre-playoff tie-break tables played (seed/seeding games). Does not award league points.';
    }
    if (category.includes('Without Losing to')) {
        return 'Counts consecutive games played where at least one opponent of the specific gender was present, and the player finished better than all of them.';
    }
    if (scope === 'Player Matchups') {
        if (category === 'Games vs Each Opponent') {
            return '<strong>Regular season only.</strong> Number of games at the same table as each opponent (every shared game counts once). Sorted by most games together.';
        }
        if (category.startsWith('Best Against')) {
            return '<strong>Regular season only.</strong> Your average league points in games at the same table as this opponent. Opponents need the minimum number of shared games shown in the title.';
        }
        if (category.startsWith('Worst Against')) {
            return '<strong>Regular season only.</strong> Your average league points when this opponent was at your table. Lower means tougher matchups for you (or worse finishes). Minimum shared games in the title.';
        }
        if (category.startsWith('Best With')) {
            return '<strong>Regular season only.</strong> Combined average points (you + this player) per game at the same table. Minimum shared games in the title.';
        }
        if (category.startsWith('Worst With')) {
            return '<strong>Regular season only.</strong> Lowest combined averages with this player at your table. Minimum shared games in the title.';
        }
        if (category.includes('Matchup Droughts')) {
            return '<strong>Reg + post season.</strong> Only <strong>current</strong> league players appear as opponents. Same rules as Rivalries: weeks since you last shared a table (must be &gt; 6), or if you never have, overlapping weeks where you both played but not together (&gt; 6 chances). Sorted by longest drought.';
        }
    }
    return '';
}

function entryHasNote(entry) {
    const c = entry.context;
    if (c == null) return false;
    return String(c).trim() !== '';
}

const TOOLTIP_PAD = 8;
const TOOLTIP_GAP = 8;
const TOOLTIP_MAX_W = 240;

function StatTitleTooltip({ html }) {
    const containerRef = useRef(null);
    const bubbleRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const shown = open || hovered;

    const placeTooltip = useCallback(() => {
        const container = containerRef.current;
        const bubble = bubbleRef.current;
        if (!container || !bubble) return;

        const cr = container.getBoundingClientRect();
        const maxW = Math.min(TOOLTIP_MAX_W, window.innerWidth - 2 * TOOLTIP_PAD);
        bubble.style.width = `${maxW}px`;
        bubble.style.boxSizing = 'border-box';

        const tw = bubble.offsetWidth;
        const th = bubble.offsetHeight;
        const iconCenterX = cr.left + cr.width / 2;

        let left = iconCenterX - tw / 2;
        left = Math.max(TOOLTIP_PAD, Math.min(left, window.innerWidth - TOOLTIP_PAD - tw));

        let top = cr.top - TOOLTIP_GAP - th;
        let placeBelow = false;
        if (top < TOOLTIP_PAD) {
            top = cr.bottom + TOOLTIP_GAP;
            placeBelow = true;
        }
        if (top + th > window.innerHeight - TOOLTIP_PAD) {
            top = Math.max(TOOLTIP_PAD, window.innerHeight - TOOLTIP_PAD - th);
        }

        bubble.style.position = 'fixed';
        bubble.style.left = `${left}px`;
        bubble.style.top = `${top}px`;
        bubble.style.marginLeft = '0';
        bubble.style.transform = 'none';

        const arrowLeft = Math.max(12, Math.min(tw - 12, iconCenterX - left));
        bubble.style.setProperty('--lad-arrow-left', `${arrowLeft}px`);

        bubble.classList.toggle('lad-tooltip-text--below', placeBelow);
    }, []);

    useLayoutEffect(() => {
        if (!shown) {
            const bubble = bubbleRef.current;
            if (bubble) {
                bubble.style.visibility = 'hidden';
                bubble.style.opacity = '0';
            }
            return;
        }
        const bubble = bubbleRef.current;
        if (bubble) {
            bubble.style.visibility = 'visible';
            bubble.style.opacity = '1';
        }
        placeTooltip();
        const id = requestAnimationFrame(() => placeTooltip());
        return () => cancelAnimationFrame(id);
    }, [shown, html, placeTooltip]);

    useEffect(() => {
        if (!shown) return undefined;
        const onViewportChange = () => placeTooltip();
        window.addEventListener('resize', onViewportChange);
        window.addEventListener('scroll', onViewportChange, true);
        return () => {
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('scroll', onViewportChange, true);
        };
    }, [shown, placeTooltip]);

    useEffect(() => {
        const onDoc = e => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('click', onDoc);
        return () => document.removeEventListener('click', onDoc);
    }, []);

    return (
        <span
            ref={containerRef}
            className={'lad-tooltip-container' + (open ? ' lad-tooltip-active' : '')}
            onClick={e => {
                e.stopPropagation();
                setOpen(o => !o);
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <span className="lad-info-icon" aria-label="About this stat">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
            </span>
            <span
                ref={bubbleRef}
                className="lad-tooltip-text"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </span>
    );
}

function LeaderboardCard({ board }) {
    const [expanded, setExpanded] = useState(false);
    const limit = 5;
    const entries = board.entries || [];
    const hasHidden = entries.length > limit;
    const tipHtml = getBoardTooltipHtml(board);
    const hasNotesColumn = entries.some(entryHasNote);

    return (
        <div className="lad-card">
            <h3 className="lad-card-title">
                <span>{board.category}</span>
                {tipHtml ? <StatTitleTooltip html={tipHtml} /> : null}
            </h3>
            <table className={'lad-table' + (hasNotesColumn ? '' : ' lad-table--no-notes')}>
                <colgroup>
                    <col className="lad-col-rank" />
                    <col className="lad-col-player" />
                    <col className="lad-col-val" />
                    {hasNotesColumn ? <col className="lad-col-ctx" /> : null}
                </colgroup>
                <thead>
                    <tr>
                        <th className="lad-th lad-th-rank" scope="col">Rank</th>
                        <th className="lad-th lad-th-player" scope="col">Player</th>
                        <th className="lad-th lad-th-val" scope="col">Value</th>
                        {hasNotesColumn ? (
                            <th className="lad-th lad-th-ctx" scope="col">
                                <span className="lad-th-ctx-label">Notes</span>
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry, index) => (
                        <tr
                            key={`${board.category}-${entry.rank}-${entry.player}-${index}`}
                            className={!expanded && index >= limit ? 'lad-row-hidden' : ''}
                        >
                            <td className="lad-td lad-td-rank">#{entry.rank}</td>
                            <td className="lad-td lad-td-player">{entry.player}</td>
                            <td className="lad-td lad-td-val">
                                <span className="lad-val-main">{entry.value}</span>
                                {!hasNotesColumn && entry.isActive ? (
                                    <span className="lad-active" title="Active streak">
                                        {' '}
                                        Active
                                    </span>
                                ) : null}
                            </td>
                            {hasNotesColumn ? (
                                <td className="lad-td lad-td-ctx">
                                    {entry.context}
                                    {entry.isActive ? (
                                        <span className="lad-active" title="Active streak">
                                            {' '}
                                            Active
                                        </span>
                                    ) : null}
                                </td>
                            ) : null}
                        </tr>
                    ))}
                </tbody>
            </table>
            {hasHidden ? (
                <button
                    type="button"
                    className="lad-expand"
                    onClick={() => setExpanded(e => !e)}
                >
                    {expanded ? 'Collapse' : `Show full leaderboard (${entries.length})`}
                </button>
            ) : null}
        </div>
    );
}

const LeagueAnalyticsDashboard = ({ data }) => {
    const scopes = useMemo(() => {
        const grouped = {};
        (data.leaderboards || []).forEach(lb => {
            if (!grouped[lb.scope]) grouped[lb.scope] = [];
            grouped[lb.scope].push(lb);
        });
        return grouped;
    }, [data]);

    const scopeNames = Object.keys(scopes);
    const [activeScope, setActiveScope] = useState('');

    useEffect(() => {
        const names = Object.keys(scopes);
        if (!names.length) return;
        setActiveScope(prev => (prev && names.includes(prev) ? prev : names[0]));
    }, [scopes]);

    const displayScope =
        activeScope && scopeNames.includes(activeScope) ? activeScope : scopeNames[0] || '';

    if (!scopeNames.length) {
        return <div className="lad-empty">No leaderboard data.</div>;
    }

    return (
        <div className="lad-root">
            <div className="league-analytics-header">League Analytics</div>
            
            <div className="lad-tabs" role="tablist">
                {scopeNames.map(name => (
                    <button
                        key={name}
                        type="button"
                        role="tab"
                        aria-selected={displayScope === name}
                        className={'lad-tab-btn' + (displayScope === name ? ' lad-tab-active' : '')}
                        onClick={() => setActiveScope(name)}
                    >
                        {name}
                    </button>
                ))}
            </div>

            {scopeNames.map(scopeName => {
                if (scopeName !== displayScope) return null;
                const boards = scopes[scopeName];
                const subcats = {};
                boards.forEach(b => {
                    if (!subcats[b.subcategory]) subcats[b.subcategory] = [];
                    subcats[b.subcategory].push(b);
                });

                return (
                    <div
                        key={scopeName}
                        className="lad-pane"
                        role="tabpanel"
                    >
                        <div className="lad-subnav">
                            <span className="lad-jump-label">Jump to:</span>
                            {Object.keys(subcats).map(subName => (
                                <button
                                    key={subName}
                                    type="button"
                                    className="lad-subnav-btn"
                                    onClick={() => {
                                        const id = `lad-h-${safeId(scopeName)}-${safeId(subName)}`;
                                        const el = document.getElementById(id);
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                >
                                    {subName}
                                </button>
                            ))}
                        </div>

                        {Object.entries(subcats).map(([subName, subBoards]) => (
                            <section key={subName}>
                                <h2
                                    id={`lad-h-${safeId(scopeName)}-${safeId(subName)}`}
                                    className="lad-subcat-header"
                                >
                                    {subName}
                                </h2>
                                <div className="lad-grid">
                                    {subBoards.map((board, bi) => (
                                        <LeaderboardCard
                                            key={`${board.category}-${board.subcategory}-${bi}`}
                                            board={board}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

export default LeagueAnalyticsDashboard;
