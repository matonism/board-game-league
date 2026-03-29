/**
 * weekOverWeekDeltas.js
 * Analyzes week-to-week deltas in board game league data to identify
 * historic events that happened in the previous week.
 * Input: tools/output/Schedules.txt (same as generateReports7.js)
 * Output: tools/analysis/week_over_week_events.html
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
const ANALYSIS_DIR = path.join(__dirname, 'analysis');
const DATA_FILE = path.join(OUTPUT_DIR, 'Schedules.txt');
const HTML_FILE = path.join(ANALYSIS_DIR, 'week_over_week_events.html');

const POINTS = { 1: 3, 2: 2, 3: 1, 4: 0 };
/** Inaugural season (2022); rookie records only apply for players after this season. */
const INAUGURAL_SEASON = 2022;

function isTieBreakWeekLabel(weekLabel) {
    const n = String(weekLabel)
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return n.includes('tie break') || n.includes('tiebreaker');
}

function getWeekSortIndex(label) {
    if (isTieBreakWeekLabel(label)) return 19;
    if (label.startsWith('Week')) return parseInt(label.split(' ')[1], 10);
    if (label.includes('Playoff 1')) return 20;
    if (label.includes('Playoff 2')) return 21;
    if (label.includes('Championship')) return 22;
    return 99;
}

function parseSchedule(data) {
    const games = [];
    for (const [seasonStr, weeks] of Object.entries(data)) {
        const season = parseInt(seasonStr, 10);
        if (Number.isNaN(season)) continue;
        weeks.forEach(weekData => {
            const weekLabel = weekData.week;
            const isTieBreak = isTieBreakWeekLabel(weekLabel);
            const weekIndex = getWeekSortIndex(weekLabel);
            const isPostSeason =
                !isTieBreak && (weekLabel.includes('Playoff') || weekLabel.includes('Championship'));
            if (weekData.results) {
                weekData.results.forEach(table => {
                    const location = table.location;
                    if (table.players) {
                        table.players.forEach(p => {
                            if (p.placement) {
                                const place = parseInt(p.placement, 10);
                                const points = isTieBreak ? 0 : (POINTS[place] || 0);
                                games.push({
                                    season,
                                    weekLabel,
                                    weekIndex,
                                    isPostSeason,
                                    isTieBreak,
                                    gameName: weekData.game,
                                    player: p.player,
                                    place,
                                    points: points,
                                    isHome: location && location.includes(p.player),
                                    location: location || ''
                                });
                            }
                        });
                    }
                });
            }
        });
    }
    return games;
}

/**
 * Parse schedule into tables (for head-to-head). Each table = one game with 4 players.
 * Returns array of { season, weekIndex, weekLabel, isPostSeason, players: [{ player, place }] }.
 */
function parseScheduleTables(data) {
    const tables = [];
    for (const [seasonStr, weeks] of Object.entries(data)) {
        const season = parseInt(seasonStr, 10);
        if (Number.isNaN(season)) continue;
        weeks.forEach(weekData => {
            const weekLabel = weekData.week;
            const isTieBreak = isTieBreakWeekLabel(weekLabel);
            const weekIndex = getWeekSortIndex(weekLabel);
            const isPostSeason =
                !isTieBreak && (weekLabel.includes('Playoff') || weekLabel.includes('Championship'));
            if (weekData.results) {
                weekData.results.forEach(table => {
                    if (table.players && table.players.every(p => p.placement)) {
                        const players = table.players.map(p => ({
                            player: p.player,
                            place: parseInt(p.placement, 10)
                        }));
                        if (players.length >= 2) {
                            tables.push({
                                season,
                                weekIndex,
                                weekLabel,
                                isPostSeason,
                                isTieBreak,
                                players
                            });
                        }
                    }
                });
            }
        });
    }
    return tables;
}

/**
 * Build head-to-head record for all pairs through given week (regular season only).
 * Returns Map of pairKey (sorted "A|B") -> { winsA, winsB, games }.
 */
function buildHeadToHeadThroughWeek(allTables, throughSeason, throughWeekIndex) {
    const h2h = new Map();
    const regTables = allTables.filter(t => !t.isPostSeason && t.weekIndex >= 1 && t.weekIndex <= 6);
    for (const t of regTables) {
        if (t.season > throughSeason || (t.season === throughSeason && t.weekIndex > throughWeekIndex)) continue;
        for (let i = 0; i < t.players.length; i++) {
            for (let j = i + 1; j < t.players.length; j++) {
                let a = t.players[i].player; 
                let b = t.players[j].player; 
                let placeA = t.players[i].place;
                let placeB = t.players[j].place;
                const key = [a, b].sort().join('|');
                if([a, b].join('|')!== key){
                    a = t.players[j].player;
                    b = t.players[i].player; 
                    placeA = t.players[j].place;
                    placeB = t.players[i].place;
                }
                if (!h2h.has(key)) h2h.set(key, { winsA: 0, winsB: 0, games: 0, playerA: a, playerB: b });
                const rec = h2h.get(key);
                rec.games += 1;
                if (placeA < placeB) rec.winsA += 1;
                else rec.winsB += 1;
            }
        }
    }
    return h2h;
}

// ========== All-time leaderboard stats (mirror generateReports7 "All-Time Regular Season") ==========
function allTimeSums(games, field) {
    const grouped = groupGamesByPlayer(games);
    const results = [];
    for (const [player, records] of grouped) {
        const sum = records.reduce((acc, r) => acc + r[field], 0);
        results.push({ player, value: sum });
    }
    return results.sort((a, b) => b.value - a.value);
}

function allTimeAveragePoints(games, minGames = 5) {
    const grouped = groupGamesByPlayer(games);
    const results = [];
    for (const [player, records] of grouped) {
        if (records.length < minGames) continue;
        const sum = records.reduce((acc, r) => acc + r.points, 0);
        const avg = sum / records.length;
        results.push({ player, value: avg, raw: avg });
    }
    return results.sort((a, b) => b.raw - a.raw);
}

function allTimeCounts(games, filterFn) {
    const grouped = groupGamesByPlayer(games);
    const results = [];
    for (const [player, records] of grouped) {
        const count = records.filter(filterFn).length;
        results.push({ player, value: count });
    }
    return results.sort((a, b) => b.value - a.value);
}

function allTimeStreaks(games, hitFn) {
    const grouped = groupGamesByPlayer(games);
    const results = [];
    for (const [player, records] of grouped) {
        const sorted = [...records].sort((a, b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));
        let current = 0;
        let max = 0;
        sorted.forEach(g => {
            if (hitFn(g)) {
                current++;
                if (current > max) max = current;
            } else current = 0;
        });
        results.push({ player, value: max });
    }
    return results.sort((a, b) => b.value - a.value);
}

function allTimeFastestToCareerPoints(games, target) {
    const grouped = groupGamesByPlayer(games);
    const results = [];
    for (const [player, records] of grouped) {
        const sorted = [...records].sort((a, b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));
        let pts = 0;
        let count = 0;
        for (const g of sorted) {
            pts += g.points;
            count++;
            if (pts >= target) {
                results.push({ player, value: count });
                break;
            }
        }
    }
    return results.sort((a, b) => a.value - b.value); // ascending: fewer games = better
}

/** Returns { statName: [playerAt1, playerAt2, playerAt3] } for all-time reg season stats. One player per rank (first at each distinct value). */
function buildAllTimeLeaderboardsTop3(games) {
    const regGames = games.filter(g => !g.isPostSeason && g.weekIndex >= 1 && g.weekIndex <= 6);
    const top3 = {};
    const stats = [
        { name: 'Points Leaders', getList: () => allTimeSums(regGames, 'points') },
        { name: 'Average Points per Game (min 5 games)', getList: () => allTimeAveragePoints(regGames, 5) },
        { name: 'Most 1st Places', getList: () => allTimeCounts(regGames, g => g.place === 1) },
        { name: 'Most 2nd Places', getList: () => allTimeCounts(regGames, g => g.place === 2) },
        { name: 'Most 3rd Places', getList: () => allTimeCounts(regGames, g => g.place === 3) },
        { name: 'Most 4th Places', getList: () => allTimeCounts(regGames, g => g.place === 4) },
        { name: 'Top Half Finishes (1st/2nd)', getList: () => allTimeCounts(regGames, g => g.place <= 2) },
        { name: 'Bottom Half Finishes (3rd/4th)', getList: () => allTimeCounts(regGames, g => g.place >= 3) },
        { name: 'Longest Win Streak', getList: () => allTimeStreaks(regGames, g => g.place === 1) },
        { name: 'Longest Streak w/o 4th', getList: () => allTimeStreaks(regGames, g => g.place !== 4) },
        { name: 'Longest Top Half Streak (1st/2nd)', getList: () => allTimeStreaks(regGames, g => g.place <= 2) },
        { name: 'Longest Winless Streak', getList: () => allTimeStreaks(regGames, g => g.place !== 1) },
        { name: 'Longest Bottom Half Streak (3rd/4th)', getList: () => allTimeStreaks(regGames, g => g.place >= 3) },
        { name: 'Fastest to 10 Career Points (# Games)', getList: () => allTimeFastestToCareerPoints(regGames, 10) },
        { name: 'Fastest to 20 Career Points (# Games)', getList: () => allTimeFastestToCareerPoints(regGames, 20) },
        { name: 'Fastest to 30 Career Points (# Games)', getList: () => allTimeFastestToCareerPoints(regGames, 30) },
        { name: 'Fastest to 40 Career Points (# Games)', getList: () => allTimeFastestToCareerPoints(regGames, 40) },
        { name: 'Fastest to 50 Career Points (# Games)', getList: () => allTimeFastestToCareerPoints(regGames, 50) }
    ];
    for (const { name, getList } of stats) {
        const list = getList();
        const ord = [];
        for (let i = 0; i < list.length && ord.length < 3; i++) {
            if (i === 0 || list[i].value !== list[i - 1].value) ord.push(list[i].player);
        }
        top3[name] = ord.slice(0, 3);
    }
    return top3;
}

/** Career point thresholds that warrant an event (inspired by "Fastest to X Career Points"). */
const CAREER_POINT_THRESHOLDS = [10, 20, 30, 40, 50, 75, 100, 125, 150, 200, 250];

/**
 * Detect league-history events: new rookie record, career points threshold, head-to-head tie broken, all-time leaderboard moves.
 * allGames = all games (chronological); throughSeason, throughWeekIndex = snapshot point.
 * prevCareerByPlayer = Map player -> career points at end of previous week (optional).
 * allTables = from parseScheduleTables; prevH2H = buildHeadToHeadThroughWeek(..., prev season/week).
 * prevLeaderboards = buildAllTimeLeaderboardsTop3Simple(throughPrevWeek) optional; if provided, detect "moved into 1st/2nd/3rd".
 */
function detectLeagueHistoryEvents(allGames, throughSeason, throughWeekIndex, prevCareerByPlayer, allTables, prevH2H, prevLeaderboards) {
    const events = [];
    const regGames = allGames.filter(g => !g.isPostSeason && g.weekIndex >= 1 && g.weekIndex <= 6);

    // Games through this week (all seasons)
    const throughThisWeek = regGames.filter(g =>
        g.season < throughSeason || (g.season === throughSeason && g.weekIndex <= throughWeekIndex));

    // --- Career points threshold ---
    const careerByPlayer = new Map();
    throughThisWeek.forEach(g => {
        careerByPlayer.set(g.player, (careerByPlayer.get(g.player) || 0) + g.points);
    });
    for (const [player, total] of careerByPlayer) {
        const prev = prevCareerByPlayer ? (prevCareerByPlayer.get(player) || 0) : 0;
        for (const thresh of CAREER_POINT_THRESHOLDS) {
            if (prev < thresh && total >= thresh) {
                events.push({
                    type: 'career_points_threshold',
                    title: `Career points milestone: ${thresh}`,
                    description: `${player} reached ${total} career points (crossed ${thresh}).`,
                    players: [player],
                    value: thresh
                });
                break; // one threshold per player per week
            }
        }
    }

    // --- New rookie record (all-time best rookie season in progress) ---
    const rookieSeasonByPlayer = new Map();
    for (const [player, games] of groupGamesByPlayer(throughThisWeek)) {
        const seasons = [...new Set(games.map(g => g.season))].sort((a, b) => a - b);
        if (seasons.length > 0) rookieSeasonByPlayer.set(player, seasons[0]);
    }
    // Completed rookie season totals (season fully finished)
    const completedRookieTotals = [];
    const seasonsInData = [...new Set(regGames.map(g => g.season))].sort((a, b) => a - b);
    for (const [player, games] of groupGamesByPlayer(regGames)) {
        const seasons = [...new Set(games.map(g => g.season))].sort((a, b) => a - b);
        const rookieSeason = seasons[0];
        const rookieGames = games.filter(g => g.season === rookieSeason && !g.isPostSeason && g.weekIndex >= 1 && g.weekIndex <= 6);
        const seasonComplete = (rookieSeason < throughSeason) || (rookieSeason === throughSeason && throughWeekIndex >= 6);
        if (seasonComplete && rookieGames.length > 0) {
            const total = rookieGames.reduce((s, g) => s + g.points, 0);
            completedRookieTotals.push({ player, total, season: rookieSeason });
        }
    }
    const previousRookieRecord = completedRookieTotals.length
        ? Math.max(...completedRookieTotals.map(r => r.total))
        : 0;
    for (const [player, rookieSeason] of rookieSeasonByPlayer) {
        if (rookieSeason !== throughSeason) continue; // only in-progress rookie this season
        if (rookieSeason <= INAUGURAL_SEASON) continue; // only count players after inaugural season
        const rookiePointsSoFar = throughThisWeek
            .filter(g => g.player === player && g.season === rookieSeason)
            .reduce((s, g) => s + g.points, 0);
        if (rookiePointsSoFar > previousRookieRecord) {
            events.push({
                type: 'new_rookie_record',
                title: 'New all-time rookie season record (in progress)',
                description: `${player} now has ${rookiePointsSoFar} points in their rookie season, surpassing the all-time record of ${previousRookieRecord}.`,
                players: [player],
                value: rookiePointsSoFar
            });
            break; // one per week (first that beats it)
        }
    }

    // --- Head-to-head tie broken ---
    const currH2H = buildHeadToHeadThroughWeek(allTables, throughSeason, throughWeekIndex);
    if (prevH2H) {
        currH2H.forEach((rec, key) => {
            const prev = prevH2H.get(key);
            if (!prev || prev.games < 2) return;
            const wasTied = prev.winsA === prev.winsB;
            const nowTied = rec.winsA === rec.winsB;
            if (wasTied && !nowTied && rec.games > prev.games) {
                const leader = rec.winsA > rec.winsB ? rec.playerA : rec.playerB;
                const trailer = rec.winsA > rec.winsB ? rec.playerB : rec.playerA;
                events.push({
                    type: 'head_to_head_tie_broken',
                    title: 'Head-to-head tie broken',
                    description: `${leader} now leads the head-to-head vs ${trailer} (${Math.max(rec.winsA, rec.winsB)}–${Math.min(rec.winsA, rec.winsB)} in games they played together).`,
                    players: [leader, trailer]
                });
            }else if (!wasTied && nowTied && rec.games > prev.games) {
                const leader = rec.winsA > rec.winsB ? rec.playerA : rec.playerB;
                const trailer = rec.winsA > rec.winsB ? rec.playerB : rec.playerA;
                events.push({
                    type: 'head_to_head_tie_broken',
                    title: 'Head-to-head tied',
                    description: `${leader} and ${trailer} are now tied head-to-head (${Math.max(rec.winsA, rec.winsB)}–${Math.min(rec.winsA, rec.winsB)} in games they played together).`,
                    players: [leader, trailer]
                });
            }
        });
    }

    // --- All-time leaderboard: moved into 1st, 2nd, or 3rd ---
    const currLeaderboards = buildAllTimeLeaderboardsTop3(throughThisWeek);
    if (prevLeaderboards) {
        for (const [statName, currTop3] of Object.entries(currLeaderboards)) {
            const prevTop3 = prevLeaderboards[statName] || [];
            for (let r = 0; r < 3; r++) {
                const currPlayer = currTop3[r];
                const prevPlayer = prevTop3[r];
                if (currPlayer && currPlayer !== prevPlayer) {
                    const ord = ['1st', '2nd', '3rd'][r];
                    events.push({
                        type: 'all_time_leaderboard_move',
                        title: `Moved into ${ord} on all-time leaderboard`,
                        description: `${currPlayer} is now ${ord} in "${statName}".`,
                        players: [currPlayer],
                        value: statName,
                        rank: r + 1
                    });
                }
            }
        }
    }

    return events;
}

function groupGamesByPlayer(games) {
    const map = new Map();
    games.forEach(g => {
        if (!map.has(g.player)) map.set(g.player, []);
        map.get(g.player).push(g);
    });
    return map;
}

/**
 * Build cumulative standings for a season after each regular-season week.
 * Returns array of { weekIndex, weekLabel, standings } where standings is
 * [{ player, points, games, rank }] sorted by points desc then rank.
 */
function buildWeeklyStandings(seasonGames) {
    const regSeason = seasonGames.filter(g => !g.isPostSeason && g.weekIndex >= 1 && g.weekIndex <= 6);
    const weeks = [];
    const seen = new Set();
    regSeason.forEach(g => {
        const key = `${g.weekIndex}-${g.weekLabel}`;
        if (!seen.has(key)) {
            seen.add(key);
            weeks.push({ weekIndex: g.weekIndex, weekLabel: g.weekLabel });
        }
    });
    weeks.sort((a, b) => a.weekIndex - b.weekIndex);

    const result = [];
    for (const w of weeks) {
        const gamesThroughWeek = regSeason.filter(g => g.weekIndex <= w.weekIndex);
        const byPlayer = new Map();
        gamesThroughWeek.forEach(g => {
            if (!byPlayer.has(g.player)) {
                byPlayer.set(g.player, { points: 0, games: 0 });
            }
            const rec = byPlayer.get(g.player);
            rec.points += g.points;
            rec.games += 1;
        });
        const standings = Array.from(byPlayer.entries())
            .map(([player, { points, games }]) => ({ player, points, games }))
            .sort((a, b) => b.points - a.points || b.games - a.games);
        // Assign ranks (ties get same rank, next rank skips)
        let rank = 1;
        for (let i = 0; i < standings.length; i++) {
            if (i > 0 && (standings[i].points !== standings[i - 1].points)) rank = i + 1;
            standings[i].rank = rank;
        }
        result.push({ weekIndex: w.weekIndex, weekLabel: w.weekLabel, standings });
    }
    return result;
}

/**
 * Points earned in a single week only (that week's games).
 */
function pointsInWeek(seasonGames, weekIndex) {
    const weekGames = seasonGames.filter(g => !g.isPostSeason && g.weekIndex === weekIndex);
    const byPlayer = new Map();
    weekGames.forEach(g => {
        if (!byPlayer.has(g.player)) byPlayer.set(g.player, 0);
        byPlayer.set(g.player, byPlayer.get(g.player) + g.points);
    });
    return Array.from(byPlayer.entries())
        .map(([player, points]) => ({ player, points }))
        .sort((a, b) => b.points - a.points);
}

/**
 * Detect historic events between previous week and current week.
 */
function detectEvents(season, prevWeek, currWeek, seasonGames) {
    const events = [];
    const prevStandings = prevWeek.standings;
    const currStandings = currWeek.standings;
    const prevRankByPlayer = new Map(prevStandings.map(s => [s.player, s.rank]));
    const currRankByPlayer = new Map(currStandings.map(s => [s.player, s.rank]));
    const currPointsByPlayer = new Map(currStandings.map(s => [s.player, s.points]));

    // New leader
    const prevLeader = prevStandings.length ? prevStandings[0].player : null;
    const currLeader = currStandings.length ? currStandings[0].player : null;
    if (prevLeader && currLeader && prevLeader !== currLeader) {
        events.push({
            type: 'new_leader',
            title: 'New #1 in the standings',
            description: `${currLeader} overtook ${prevLeader} for first place.`,
            players: [currLeader, prevLeader]
        });
    }

    // First time in 1st (this season) — only if we didn't already report "new leader" for same player
    const reportedNewLeader = events.some(e => e.type === 'new_leader');
    if (currLeader && !reportedNewLeader) {
        const hadBeenFirstBefore = prevStandings.some(s => s.rank === 1 && s.player === currLeader);
        if (!hadBeenFirstBefore && currLeader === currStandings[0].player) {
            events.push({
                type: 'first_time_first',
                title: 'First time in first place this season',
                description: `${currLeader} took the lead for the first time this season.`,
                players: [currLeader]
            });
        }
    }

    // Tied for 1st
    const topPoints = currStandings.length ? currStandings[0].points : 0;
    const tiedForFirst = currStandings.filter(s => s.rank === 1);
    if (tiedForFirst.length > 1) {
        events.push({
            type: 'tied_for_first',
            title: 'Tied for first place',
            description: `${tiedForFirst.map(s => s.player).join(' and ')} are tied at the top with ${topPoints} points.`,
            players: tiedForFirst.map(s => s.player)
        });
    }

    // Biggest rank jump (among players who were also in previous week)
    let bestJump = { delta: 0, player: null };
    currStandings.forEach(s => {
        const prevRank = prevRankByPlayer.get(s.player);
        if (prevRank == null) return;
        const delta = prevRank - s.rank; // positive = moved up
        if (delta > bestJump.delta) {
            bestJump = { delta, player: s.player, from: prevRank, to: s.rank };
        }
    });
    if (bestJump.delta > 0) {
        events.push({
            type: 'biggest_climb',
            title: 'Biggest rise in the standings',
            description: `${bestJump.player} jumped ${bestJump.delta} spot(s) (${bestJump.from} → ${bestJump.to}).`,
            players: [bestJump.player],
            value: bestJump.delta
        });
    }

    // Biggest rank drop
    let worstDrop = { delta: 0, player: null };
    currStandings.forEach(s => {
        const prevRank = prevRankByPlayer.get(s.player);
        if (prevRank == null) return;
        const delta = s.rank - prevRank; // positive = dropped
        if (delta > worstDrop.delta) {
            worstDrop = { delta, player: s.player, from: prevRank, to: s.rank };
        }
    });
    if (worstDrop.delta > 0) {
        events.push({
            type: 'biggest_drop',
            title: 'Biggest drop in the standings',
            description: `${worstDrop.player} fell ${worstDrop.delta} spot(s) (${worstDrop.from} → ${worstDrop.to}).`,
            players: [worstDrop.player],
            value: worstDrop.delta
        });
    }

    // Top point earner this week
    const weekPoints = pointsInWeek(seasonGames, currWeek.weekIndex);
    if (weekPoints.length > 0) {
        const top = weekPoints[0];
        const maxPoints = weekPoints.filter(p => p.points === top.points);
        if (maxPoints.length === 1) {
            events.push({
                type: 'top_weekly_scorer',
                title: 'Top scorer this week',
                description: `${top.player} earned ${top.points} point(s) this week.`,
                players: [top.player],
                value: top.points
            });
        }
    }

    return events;
}

function main() {
    console.log('Reading data from:', DATA_FILE);
    if (!fs.existsSync(DATA_FILE)) {
        console.error('Error: Schedules.txt not found.');
        process.exit(1);
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const scheduleData = JSON.parse(rawData);
    const allGames = parseSchedule(scheduleData);
    allGames.sort((a, b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));

    const seasons = [...new Set(allGames.map(g => g.season))].filter(s => !Number.isNaN(s)).sort((a, b) => a - b);
    const allTables = parseScheduleTables(scheduleData);
    const regGames = allGames.filter(g => !g.isPostSeason && g.weekIndex >= 1 && g.weekIndex <= 6);

    /** Career points through (throughSeason, throughWeekIndex). */
    function careerThrough(throughSeason, throughWeekIndex) {
        const through = regGames.filter(g =>
            g.season < throughSeason || (g.season === throughSeason && g.weekIndex <= throughWeekIndex));
        const map = new Map();
        through.forEach(g => map.set(g.player, (map.get(g.player) || 0) + g.points));
        return map;
    }

    /** Games through (throughSeason, throughWeekIndex) for all-time leaderboards. */
    function gamesThrough(throughSeason, throughWeekIndex) {
        return regGames.filter(g =>
            g.season < throughSeason || (g.season === throughSeason && g.weekIndex <= throughWeekIndex));
    }

    const allDeltas = []; // { season, weekIndex, weekLabel, events, currStandings, prevStandings }

    for (const season of seasons) {
        const seasonGames = allGames.filter(g => g.season === season);
        const weekly = buildWeeklyStandings(seasonGames);
        if (weekly.length === 0) continue;

        // --- After Week 1 ---
        const week1 = weekly[0];
        const prevCareerWeek0 = season > Math.min(...seasons) ? careerThrough(season - 1, 6) : new Map();
        const prevH2HWeek0 = season > Math.min(...seasons)
            ? buildHeadToHeadThroughWeek(allTables, season - 1, 6)
            : new Map();
        const prevLeaderboardsWeek0 = season > Math.min(...seasons)
            ? buildAllTimeLeaderboardsTop3(gamesThrough(season - 1, 6))
            : null;
        const eventsWeek1 = detectEvents(season, { standings: [] }, week1, seasonGames);
        const leagueHistoryWeek1 = detectLeagueHistoryEvents(
            allGames, season, 1, prevCareerWeek0, allTables, prevH2HWeek0, prevLeaderboardsWeek0
        );
        allDeltas.push({
            season,
            weekIndex: week1.weekIndex,
            weekLabel: week1.weekLabel,
            events: [...eventsWeek1, ...leagueHistoryWeek1],
            currStandings: week1.standings,
            prevStandings: null
        });

        // --- After Week 2 through Week 6 ---
        for (let i = 1; i < weekly.length; i++) {
            const prevWeek = weekly[i - 1];
            const currWeek = weekly[i];
            const events = detectEvents(season, prevWeek, currWeek, seasonGames);
            const prevCareer = careerThrough(season, prevWeek.weekIndex);
            const prevH2H = buildHeadToHeadThroughWeek(allTables, season, prevWeek.weekIndex);
            const prevLeaderboards = buildAllTimeLeaderboardsTop3(gamesThrough(season, prevWeek.weekIndex));
            const leagueHistory = detectLeagueHistoryEvents(
                allGames, season, currWeek.weekIndex, prevCareer, allTables, prevH2H, prevLeaderboards
            );
            allDeltas.push({
                season,
                weekIndex: currWeek.weekIndex,
                weekLabel: currWeek.weekLabel,
                events: [...events, ...leagueHistory],
                currStandings: currWeek.standings,
                prevStandings: prevWeek.standings
            });
        }
    }

    // Build HTML
    if (!fs.existsSync(ANALYSIS_DIR)) {
        fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
    }

    const html = buildHtml(seasons, allDeltas);
    fs.writeFileSync(HTML_FILE, html, 'utf8');
    console.log('Wrote:', HTML_FILE);
    console.log('Total week-over-week snapshots:', allDeltas.length);
}

function buildHtml(seasons, allDeltas) {
    const bySeason = new Map();
    allDeltas.forEach(d => {
        if (!bySeason.has(d.season)) bySeason.set(d.season, []);
        bySeason.get(d.season).push(d);
    });

    const eventTypeLabels = {
        new_leader: 'New #1',
        first_time_first: 'First time in 1st',
        tied_for_first: 'Tied for 1st',
        biggest_climb: 'Biggest climb',
        biggest_drop: 'Biggest drop',
        top_weekly_scorer: 'Top scorer (week)'
    };

    const rows = allDeltas.map(d => {
        const eventsHtml = d.events.length === 0
            ? '<span class="no-events">No standout events</span>'
            : d.events.map(e => `
                <div class="event-item event-${e.type}">
                    <span class="event-title">${e.title}</span>
                    <span class="event-desc">${e.description}</span>
                </div>`).join('');
        const standingsPreview = d.currStandings.slice(0, 5).map((s, i) =>
            `${i + 1}. ${s.player} (${s.points} pts)`).join(' · ');
        return {
            season: d.season,
            weekLabel: d.weekLabel,
            eventsHtml,
            standingsPreview,
            eventCount: d.events.length
        };
    });

    const seasonTabs = seasons.map(s => `
        <button type="button" class="tab-btn season-tab" data-season="${s}">Season ${s}</button>`).join('');

    const timelineBySeason = seasons.map(season => {
        const deltas = bySeason.get(season) || [];
        const cards = deltas.map(d => {
            const eventsHtml = d.events.length === 0
                ? '<p class="no-events">No standout events this week.</p>'
                : d.events.map(e => `
                    <div class="event-card event-${e.type}">
                        <strong>${e.title}</strong>
                        <p>${e.description}</p>
                    </div>`).join('');
            const top5 = d.currStandings.slice(0, 5).map((s, i) =>
                `<tr><td>${i + 1}</td><td>${s.player}</td><td>${s.points}</td><td>${s.games}</td></tr>`).join('');
            return `
                <div class="week-card" data-season="${season}">
                    <h3>After ${d.weekLabel}</h3>
                    <div class="week-events">${eventsHtml}</div>
                    <table class="mini-standings">
                        <thead><tr><th>#</th><th>Player</th><th>Pts</th><th>G</th></tr></thead>
                        <tbody>${top5}</tbody>
                    </table>
                </div>`;
        }).join('');
        return `<div class="season-timeline" data-season="${season}">${cards}</div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Week-over-Week Deltas — Historic Events</title>
    <style>
        :root {
            --primary: #1e40af;
            --bg: #f1f5f9;
            --surface: #ffffff;
            --text: #1e293b;
            --border: #e2e8f0;
            --new-leader: #15803d;
            --climb: #0d9488;
            --drop: #b91c1c;
            --scorer: #7c3aed;
        }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        header { text-align: center; margin-bottom: 28px; }
        h1 { margin: 0; color: var(--primary); font-size: 1.75rem; }
        .subtitle { color: #64748b; font-size: 0.95rem; margin-top: 6px; }
        .tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; }
        .tab-btn { padding: 10px 18px; border: none; background: var(--surface); cursor: pointer; border-radius: 8px; font-weight: 600; color: #64748b; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: all 0.2s; }
        .tab-btn:hover { background: #e0f2fe; color: var(--primary); }
        .tab-btn.active { background: var(--primary); color: white; }
        .season-timeline { display: none; }
        .season-timeline.active { display: block; }
        .week-card { background: var(--surface); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid var(--border); }
        .week-card h3 { margin: 0 0 14px 0; color: var(--primary); font-size: 1.15rem; }
        .week-events { margin-bottom: 16px; }
        .event-card { padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #94a3b8; }
        .event-card.event-new_leader { border-left-color: var(--new-leader); background: #dcfce7; }
        .event-card.event-first_time_first { border-left-color: var(--new-leader); background: #dcfce7; }
        .event-card.event-tied_for_first { border-left-color: #ca8a04; background: #fef9c3; }
        .event-card.event-biggest_climb { border-left-color: var(--climb); background: #ccfbf1; }
        .event-card.event-biggest_drop { border-left-color: var(--drop); background: #fee2e2; }
        .event-card.event-top_weekly_scorer { border-left-color: var(--scorer); background: #ede9fe; }
        .event-card.event-career_points_threshold { border-left-color: #0d9488; background: #ccfbf1; }
        .event-card.event-new_rookie_record { border-left-color: #ca8a04; background: #fef9c3; }
        .event-card.event-head_to_head_tie_broken { border-left-color: #2563eb; background: #dbeafe; }
        .event-card.event-all_time_leaderboard_move { border-left-color: #059669; background: #d1fae5; }
        .event-card strong { display: block; margin-bottom: 4px; }
        .event-card p { margin: 0; font-size: 0.95em; color: #475569; }
        .no-events { color: #94a3b8; font-style: italic; font-size: 0.9em; }
        .mini-standings { width: 100%; max-width: 320px; border-collapse: collapse; font-size: 0.9em; }
        .mini-standings th { text-align: left; color: #64748b; font-weight: 600; padding: 6px 8px 6px 0; border-bottom: 1px solid var(--border); }
        .mini-standings td { padding: 6px 8px 6px 0; border-bottom: 1px solid #f1f5f9; }
        .mini-standings tbody tr:last-child td { border-bottom: none; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Week-over-Week Historic Events</h1>
            <p class="subtitle">Events that happened in the previous week (standings and rank changes)</p>
        </header>
        <div class="tabs">${seasonTabs}</div>
        ${timelineBySeason}
    </div>
    <script>
        document.querySelectorAll('.season-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.season-tab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.season-timeline').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                const s = btn.dataset.season;
                document.querySelector('.season-timeline[data-season="' + s + '"]').classList.add('active');
            });
        });
        const firstTab = document.querySelector('.season-tab');
        if (firstTab) { firstTab.click(); }
    </script>
</body>
</html>`;
}

main();
