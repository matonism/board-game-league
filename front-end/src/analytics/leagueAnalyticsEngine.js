/**
 * League analytics for the React app (browser).
 *
 * Stats logic is intentionally duplicated from tools/generateReports7.js (constants,
 * processStat, helpers, and computeLeagueAnalytics ≈ main()'s stat pipeline). When you
 * change formulas or leaderboards, update BOTH files.
 *
 * Input: same JSON shape as tools/output/Schedules.txt (object keyed by season year).
 *
 * Long-term: one shared module required by generateReports7 for export and by this app.
 */
const POINTS = { 1: 3, 2: 2, 3: 1, 4: 0 };

const REGULAR_SEASON_LAST_WEEK = 6;

const INFERRED_QUALIFIERS_LARGE_LEAGUE_MIN_PLAYERS = 20;
const INFERRED_QUALIFIERS_COUNT_SMALL = 4;
const INFERRED_QUALIFIERS_COUNT_LARGE = 8;

const GENDER_MAP = {
    "Brian": "M", "Dan": "M", "Ryan": "M", "Josh": "M", "Nick": "M",
    "Austin": "M", "Richie": "M", "Luke": "M", "Michael": "M", "Steve": "M",
    "Tyler": "M", "Jack M": "M", "Jack C": "M", "Cody": "M", "Ian": "M", "Sam": "M",
    "Rachel F": "F", "Becca": "F", "Ashley": "F", "Allie": "F", "Carly": "F",
    "Rachel M": "F", "Emma": "F", "Jennie": "F", "Brittany": "F"
};

/** Reset each run of computeLeagueAnalytics */
let jsonOutput;
let csvRows;

function processStat(category, subcategory, scope, sortedList) {
    if (!sortedList || sortedList.length === 0) return;

    // 1. Console Output
    // console.log(`\n> ${category} [${scope}]`);
    let rank = 1;
    for (let i = 0; i < sortedList.length; i++) {
        const current = sortedList[i];
        const prev = i > 0 ? sortedList[i-1] : null;
        if (prev && prev.value !== current.value) rank = i + 1;
        
        const extra = current.extra ? current.extra : '';
        const activeMark = current.isActive ? " [ACTIVE]" : "";
        
        // Only print Top 5 to console to keep it clean
        // if (i < 5) console.log(`  ${rank}. ${current.player.padEnd(15)}: ${current.value} ${extra}${activeMark}`);
    }

    // 2. Prepare JSON Entry
    const jsonEntry = {
        category: category,
        subcategory: subcategory, // Added Subcategory
        scope: scope,
        entries: []
    };

    rank = 1;
    for (let i = 0; i < sortedList.length; i++) {
        const current = sortedList[i];
        const prev = i > 0 ? sortedList[i-1] : null;
        if (prev && prev.value !== current.value) rank = i + 1;

        const extra = current.extra ? current.extra : '';
        const safeCategory = `"${category}"`;
        const safeSubcategory = `"${subcategory}"`;
        const safeScope = `"${scope}"`;
        const safePlayer = `"${current.player}"`;
        const safeContext = extra ? `"${extra.replace(/[\(\)]/g, '')}"` : "";
        const isActive = current.isActive ? "true" : "false";

        // CSV
        csvRows.push(`${safeCategory},${safeSubcategory},${safeScope},${rank},${safePlayer},${current.value},${safeContext},${isActive}`);

        // JSON
        jsonEntry.entries.push({
            rank: rank,
            player: current.player,
            value: current.value,
            context: safeContext.replace(/"/g, ""),
            isActive: current.isActive
        });
    }

    jsonOutput.leaderboards.push(jsonEntry);
}

// =============================================
// PARSING LOGIC
// =============================================

function isTieBreakWeekLabel(weekLabel) {
    const n = String(weekLabel)
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    // "Tie Break", "Tie-Break", "Tiebreaker", "tie breaker seeding", etc.
    return n.includes('tie break') || n.includes('tiebreaker');
}

function parseSchedule(data) {
    const games = [];
    let gameIdCounter = 1; // Unique ID for each table result

    for (const [seasonStr, weeks] of Object.entries(data)) {
        const season = parseInt(seasonStr);
        weeks.forEach(weekData => {
            const weekLabel = weekData.week;
            const isTieBreak = isTieBreakWeekLabel(weekLabel);
            const weekIndex = getWeekSortIndex(weekLabel);
            // Updated regex to catch "Championship" as a post-season game
            const isPostSeason =
                !isTieBreak && (weekLabel.includes('Playoff') || weekLabel.includes('Championship'));
            if (weekData.results) {
                weekData.results.forEach(table => {
                    const currentGameId = gameIdCounter++; // Assign ID
                    const location = table.location;
                    
                    // Determine if Neutral Site (No player in the game is in the location string)
                    let isNeutralSite = false;
                    if (table.players && location) {
                        const playerNames = table.players.map(p => p.player);
                        // Check if ANY player name appears in the location string
                        const isHosted = playerNames.some(name => location.includes(name));
                        isNeutralSite = !isHosted && location !== 'TBD' && location !== null && location !== 'DNP';
                    }

                    if (table.players) {
                        table.players.forEach(p => {
                            if (p.placement) {
                                const place = parseInt(p.placement);
                                const points = isTieBreak ? 0 : (POINTS[place] || 0);
                                games.push({
                                    gameId: currentGameId, // Pass ID through
                                    season: season,
                                    weekLabel: weekLabel,
                                    weekIndex: weekIndex,
                                    isPostSeason: isPostSeason,
                                    isTieBreak: isTieBreak,
                                    gameName: weekData.game,
                                    player: p.player,
                                    place: place,
                                    points: points,
                                    isHome: location !== null ? location.includes(p.player) : false,
                                    isNeutral: isNeutralSite, 
                                    location: location
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

function getWeekSortIndex(label) {
    if (isTieBreakWeekLabel(label)) return 19;
    if (label.startsWith("Week")) return parseInt(label.split(' ')[1]);
    if (label.includes("Playoff 1")) return 20;
    if (label.includes("Playoff 2")) return 21;
    if (label.includes("Championship")) return 22;
    return 99;
}

function buildSeasonsWithRegularSeasonComplete(regSeasonGames) {
    const s = new Set();
    regSeasonGames.forEach(g => {
        if (g.weekIndex >= REGULAR_SEASON_LAST_WEEK) s.add(g.season);
    });
    return s;
}

/**
 * Top N by regular-season points when playoff games are not in the file yet.
 * N is 8 if the season has at least INFERRED_QUALIFIERS_LARGE_LEAGUE_MIN_PLAYERS unique players, else 4.
 */
function topRegularSeasonQualifiersByPoints(regGamesForSeason) {
    const totals = {};
    regGamesForSeason.forEach(g => {
        totals[g.player] = (totals[g.player] || 0) + g.points;
    });
    const playerCount = Object.keys(totals).length;
    const n =
        playerCount >= INFERRED_QUALIFIERS_LARGE_LEAGUE_MIN_PLAYERS
            ? INFERRED_QUALIFIERS_COUNT_LARGE
            : INFERRED_QUALIFIERS_COUNT_SMALL;
    return new Set(
        Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([p]) => p)
    );
}

/**
 * Playoff qualifier set per season: from postseason games when present,
 * otherwise inferred from regular-season standings after Week 6 is complete.
 */
function buildPlayoffQualifiersBySeason(allGames, regSeasonGames) {
    const qualifiers = {};
    allGames.filter(g => g.isPostSeason).forEach(g => {
        if (!qualifiers[g.season]) qualifiers[g.season] = new Set();
        qualifiers[g.season].add(g.player);
    });
    const regComplete = buildSeasonsWithRegularSeasonComplete(regSeasonGames);
    const bySeason = {};
    regSeasonGames.forEach(g => {
        if (!bySeason[g.season]) bySeason[g.season] = [];
        bySeason[g.season].push(g);
    });
    for (const season of regComplete) {
        if (qualifiers[season] && qualifiers[season].size > 0) continue;
        qualifiers[season] = topRegularSeasonQualifiersByPoints(bySeason[season] || []);
    }
    return qualifiers;
}

// =============================================
// STAT CALCULATIONS
// =============================================

function groupByPlayer(games) {
    const map = {};
    games.forEach(g => {
        if (!map[g.player]) map[g.player] = [];
        map[g.player].push(g);
    });
    return map;
}

function getSums(games, field) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        const sum = records.reduce((acc, r) => acc + r[field], 0);
        results.push({ player, value: sum });
    }
    return results.sort((a, b) => b.value - a.value);
}

function getAveragePoints(games, minGames = 1) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        if (records.length < minGames) continue;
        const sum = records.reduce((acc, r) => acc + r.points, 0);
        const avg = sum / records.length;
        results.push({ player, value: avg.toFixed(2), raw: avg, extra: `(${records.length} games)` });
    }
    return results.sort((a, b) => b.raw - a.raw);
}

// NEW: Strength of Schedule
function calculateStrengthOfSchedule(games) {
    // 1. Calculate Avg Points for EVERY player first
    const playerAvgs = {};
    const grouped = groupByPlayer(games);
    for (const [player, records] of Object.entries(grouped)) {
        const sum = records.reduce((acc, r) => acc + r.points, 0);
        playerAvgs[player] = sum / records.length;
    }

    // 2. Map GameID -> List of Players in that game
    const gameTables = {};
    games.forEach(g => {
        if(!gameTables[g.gameId]) gameTables[g.gameId] = [];
        gameTables[g.gameId].push(g.player);
    });

    // 3. For each player, calculate avg of OPPONENTS' avgs
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        let totalOpponentStrength = 0;
        let opponentCount = 0;

        records.forEach(g => {
            const tablePlayers = gameTables[g.gameId] || [];
            tablePlayers.forEach(opp => {
                if (opp !== player && playerAvgs[opp] !== undefined) {
                    totalOpponentStrength += playerAvgs[opp];
                    opponentCount++;
                }
            });
        });

        if (opponentCount > 0) {
            const sos = totalOpponentStrength / opponentCount;
            results.push({
                player: player,
                value: sos.toFixed(3),
                raw: sos,
                extra: `(${opponentCount} opps)`
            });
        }
    }

    // Sort: Hardest (Highest Avg Opponent Score) -> Easiest
    const hardest = [...results].sort((a,b) => b.raw - a.raw);
    const easiest = [...results].sort((a,b) => a.raw - b.raw);

    return { hardest, easiest, playerAvgs }; // Return playerAvgs for reuse
}

// =============================================
// NEW: Season SOS-adjusted PPG leaderboard (completed seasons)
// =============================================
function getSeasonAdjustedPPGLeaderboard(regSeasonGames, seasonsRegularSeasonComplete) {
    // Group games by season
    const gamesBySeason = {};
    regSeasonGames.forEach(g => {
        if (!gamesBySeason[g.season]) gamesBySeason[g.season] = [];
        gamesBySeason[g.season].push(g);
    });

    const results = [];

    for (const [seasonStr, sGames] of Object.entries(gamesBySeason)) {
        const season = parseInt(seasonStr, 10);
        if (!seasonsRegularSeasonComplete.has(season)) continue;

        // Player avg points (within season)
        const grouped = groupByPlayer(sGames);
        const playerAvgs = {};
        for (const [player, recs] of Object.entries(grouped)) {
            playerAvgs[player] = recs.reduce((acc, r) => acc + r.points, 0) / recs.length;
        }

        // Table map (gameId -> players)
        const tables = {};
        sGames.forEach(g => {
            if (!tables[g.gameId]) tables[g.gameId] = [];
            tables[g.gameId].push(g.player);
        });

        // Season SOS per player = avg opponent avg points (within season)
        const seasonSOS = {};
        for (const [player, recs] of Object.entries(grouped)) {
            let sumOpp = 0;
            let countOpp = 0;
            recs.forEach(r => {
                const ps = tables[r.gameId] || [];
                ps.forEach(opp => {
                    if (opp === player) return;
                    if (playerAvgs[opp] === undefined) return;
                    sumOpp += playerAvgs[opp];
                    countOpp++;
                });
            });
            seasonSOS[player] = countOpp > 0 ? (sumOpp / countOpp) : 0;
        }

        // League baseline opponent strength for this season (avg of playerAvgs)
        const baselineOpp = Object.values(playerAvgs).length
            ? Object.values(playerAvgs).reduce((a, b) => a + b, 0) / Object.values(playerAvgs).length
            : 1.5;

        // Season PPG and adjusted PPG:
        // Harder SoS => higher seasonSOS (avg opponent points higher).
        // We add a modest boost relative to baseline.
        const SOS_ADJ_WEIGHT = 0.4;

        for (const [player, recs] of Object.entries(grouped)) {
            const points = recs.reduce((acc, r) => acc + r.points, 0);
            const gamesPlayed = recs.length;
            const ppg = gamesPlayed > 0 ? points / gamesPlayed : 0;
            const sos = seasonSOS[player] ?? baselineOpp;
            const adj = ppg + ((sos - baselineOpp) * SOS_ADJ_WEIGHT);

            results.push({
                player,
                value: adj.toFixed(3),
                raw: adj,
                extra: `(${season}) pts=${points} sos=${sos.toFixed(3)}`,
                season
            });
        }
    }

    return results.sort((a, b) => b.raw - a.raw);
}

// =============================================
// NEW: Elo leaderboards
// =============================================
function getEloLeaderboard(games, opts = {}) {
    const START = 1500;
    const K = 24;
    const activePlayersSet = opts.activePlayersSet || null;

    // Ensure chronological order (season, weekIndex, then table)
    const ordered = [...games].sort((a, b) =>
        (a.season - b.season) || (a.weekIndex - b.weekIndex) || (a.gameId - b.gameId)
    );

    const elo = {};
    const eloGames = {};

    // Group by table (gameId) for pairwise comparisons
    const byTable = {};
    ordered.forEach(g => {
        if (!byTable[g.gameId]) byTable[g.gameId] = [];
        byTable[g.gameId].push(g);
    });

    const expected = (ra, rb) => 1 / (1 + Math.pow(10, (rb - ra) / 400));

    Object.values(byTable).forEach(tableGames => {
        // Only process if we have placements
        if (!tableGames || tableGames.length < 2) return;

        // Pairwise updates
        for (let i = 0; i < tableGames.length; i++) {
            for (let j = i + 1; j < tableGames.length; j++) {
                const a = tableGames[i];
                const b = tableGames[j];
                const pa = a.place;
                const pb = b.place;
                if (pa === undefined || pb === undefined) continue;

                const ra = elo[a.player] ?? START;
                const rb = elo[b.player] ?? START;
                const ea = expected(ra, rb);
                const eb = 1 - ea;

                const sa = pa < pb ? 1 : 0;
                const sb = 1 - sa;

                elo[a.player] = ra + K * (sa - ea);
                elo[b.player] = rb + K * (sb - eb);
                eloGames[a.player] = (eloGames[a.player] ?? 0) + 1;
                eloGames[b.player] = (eloGames[b.player] ?? 0) + 1;
            }
        }
    });

    return Object.keys(elo)
        .filter(player => !activePlayersSet || activePlayersSet.has(player))
        .map(player => ({
            player,
            value: (elo[player] ?? START).toFixed(1),
            raw: (elo[player] ?? START),
            extra: `(${eloGames[player] ?? 0} pairwise)`,
        }))
        .sort((a, b) => b.raw - a.raw);
}

// NEW: Hardest Path to Playoffs (Single Season SoS for Qualifiers)
function getHardestPathToPlayoffs(regGames, allGames) {
    const qualifiers = buildPlayoffQualifiersBySeason(allGames, regGames);

    // Calculate Season-Specific SoS for everyone
    // We need player averages PER SEASON, not all-time
    const seasonResults = [];
    
    // Group reg games by season
    const gamesBySeason = {};
    regGames.forEach(g => {
        if(!gamesBySeason[g.season]) gamesBySeason[g.season] = [];
        gamesBySeason[g.season].push(g);
    });

    for (const [season, sGames] of Object.entries(gamesBySeason)) {
        const sQualifiers = qualifiers[parseInt(season, 10)];
        if (!sQualifiers || sQualifiers.size === 0) continue;

        // Calcavgs for this season
        const sGrouped = groupByPlayer(sGames);
        const sPlayerAvgs = {};
        for(const [p, recs] of Object.entries(sGrouped)) {
            sPlayerAvgs[p] = recs.reduce((a,b)=>a+b.points,0) / recs.length;
        }

        // Map Tables
        const sTables = {};
        sGames.forEach(g => {
            if(!sTables[g.gameId]) sTables[g.gameId] = [];
            sTables[g.gameId].push(g.player);
        });

        // Calc SoS for QUALIFIERS only
        sQualifiers.forEach(player => {
            if (!sGrouped[player]) return;
            
            let totalOppStr = 0;
            let count = 0;
            
            sGrouped[player].forEach(g => {
                const opps = sTables[g.gameId] || [];
                opps.forEach(opp => {
                    if (opp !== player && sPlayerAvgs[opp] !== undefined) {
                        totalOppStr += sPlayerAvgs[opp];
                        count++;
                    }
                });
            });

            if (count > 0) {
                const sos = totalOppStr / count;
                seasonResults.push({
                    player: player,
                    value: sos.toFixed(3),
                    raw: sos,
                    extra: `(${season})`
                });
            }
        });
    }

    return seasonResults.sort((a,b) => b.raw - a.raw);
}

function getLocationAveragePoints(games, isHome, minGames = 1) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        const subset = records.filter(g => g.isHome === isHome);
        if (subset.length < minGames) continue;
        const sum = subset.reduce((acc, r) => acc + r.points, 0);
        const avg = sum / subset.length;
        results.push({ player, value: avg.toFixed(2), raw: avg, extra: `(${subset.length} games)` });
    }
    return results.sort((a, b) => b.raw - a.raw);
}

function getLocationPointDifferential(games, minGames = 1) {
    const grouped = groupByPlayer(games);
    const results = [];

    for (const [player, records] of Object.entries(grouped)) {
        const homeGames = records.filter(g => g.isHome);
        const awayGames = records.filter(g => !g.isHome);

        if (homeGames.length < minGames || awayGames.length < minGames) continue;

        const homeAvg = homeGames.reduce((acc, r) => acc + r.points, 0) / homeGames.length;
        const awayAvg = awayGames.reduce((acc, r) => acc + r.points, 0) / awayGames.length;
        
        const diff = homeAvg - awayAvg;

        results.push({ 
            player, 
            value: (diff > 0 ? "+" : "") + diff.toFixed(2), 
            raw: diff,
            extra: `(Home: ${homeAvg.toFixed(2)}, Away: ${awayAvg.toFixed(2)})` 
        });
    }
    // Sort Descending (Positive = Better at Home, Negative = Better Away)
    return results.sort((a, b) => b.raw - a.raw);
}

function getCounts(games, filterFn) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        const count = records.filter(filterFn).length;
        results.push({ player, value: count });
    }
    return results.sort((a, b) => b.value - a.value);
}

/**
 * Tie-break tables played per player. Includes everyone who appears in leagueGames so the
 * leaderboard is never empty when there is schedule data (zeros when no tie-break rows exist).
 * Players who only appear in tieBreakGames (edge case) are included too.
 */
function getTieBreakGamesPlayedLeaderboard(tieBreakGames, leagueGames) {
    const counts = {};
    leagueGames.forEach(g => {
        counts[g.player] = 0;
    });
    tieBreakGames.forEach(g => {
        if (counts[g.player] === undefined) counts[g.player] = 0;
        counts[g.player]++;
    });
    return Object.entries(counts)
        .map(([player, value]) => ({ player, value }))
        .sort((a, b) => b.value - a.value || String(a.player).localeCompare(String(b.player)));
}

// NEW: Location Counts based on raw game data (not per player)
function getLocationCounts(games) {
    // Unique games are identified by season + week + gameName + location
    // Since games are flattened by player, we need to dedup or just count distinct locations.
    // The safest way with the flattened structure is to group by a unique game key.
    
    const uniqueGames = new Set();
    const locationCounts = {};

    games.forEach(g => {
        const gameKey = `${g.season}-${g.weekLabel}-${g.gameName}-${g.location}`;
        if (!uniqueGames.has(gameKey)) {
            uniqueGames.add(gameKey);
            
            // Count this location
            // Handle multiple hosts if string is like "Michael & Ashley"
            // Requirement: "Specific locations" -> Keep string as is.
            // Ignore "TBD"
            if (g.location && g.location !== 'TBD') {
                if (!locationCounts[g.location]) locationCounts[g.location] = 0;
                locationCounts[g.location]++;
            }
        }
    });

    const results = Object.entries(locationCounts).map(([loc, count]) => ({
        player: loc, // Using 'player' field for location name to fit data structure
        value: count
    }));

    return results.sort((a, b) => b.value - a.value);
}

// NEW: Count neutral site games per player
function getNeutralSiteCounts(games) {
    return getCounts(games, g => g.isNeutral);
}

// NEW: Count occurrences of specific neutral sites
function getNeutralSiteLocationCounts(games) {
    const uniqueGames = new Set();
    const locationCounts = {};

    games.forEach(g => {
        if (!g.isNeutral) return;
        
        const gameKey = `${g.season}-${g.weekLabel}-${g.gameName}-${g.location}`;
        if (!uniqueGames.has(gameKey)) {
            uniqueGames.add(gameKey);
            if (g.location && g.location !== 'TBD') {
                if (!locationCounts[g.location]) locationCounts[g.location] = 0;
                locationCounts[g.location]++;
            }
        }
    });

    const results = Object.entries(locationCounts).map(([loc, count]) => ({
        player: loc, 
        value: count
    }));

    return results.sort((a, b) => b.value - a.value);
}

// NEW: Most Home Games in a Single Season
function getMostHomeGamesInSeason(games) {
    const grouped = {}; // Key: Player+Season

    games.forEach(g => {
        if (!g.isHome) return;
        const key = `${g.player}|${g.season}`;
        if (!grouped[key]) grouped[key] = { player: g.player, season: g.season, count: 0 };
        grouped[key].count++;
    });

    const results = Object.values(grouped).map(entry => ({
        player: entry.player,
        value: entry.count,
        extra: `(${entry.season})`
    }));

    return results.sort((a, b) => b.value - a.value);
}

// NEW: Fewest Home Games in a Single Season
function getFewestHomeGamesInSeason(games, seasonsRegComplete) {
    const seasonPlayers = {}; // Season -> Set of Players
    const hostCounts = {};    // Key: Player|Season -> count

    // 1. Identify all players active in each season
    games.forEach(g => {
        if (!seasonPlayers[g.season]) seasonPlayers[g.season] = new Set();
        seasonPlayers[g.season].add(g.player);

        if (g.isHome) {
            const key = `${g.player}|${g.season}`;
            if (!hostCounts[key]) hostCounts[key] = 0;
            hostCounts[key]++;
        }
    });

    const results = [];

    // 2. Iterate seasons and players to find counts (including 0)
    for (const [season, players] of Object.entries(seasonPlayers)) {
        // Exclude seasons still before Week 6 in the data
        if (seasonsRegComplete && !seasonsRegComplete.has(parseInt(season, 10))) {
            continue;
        }

        players.forEach(player => {
            const key = `${player}|${season}`;
            const count = hostCounts[key] || 0;
            results.push({
                player: player,
                value: count,
                extra: `(${season})`
            });
        });
    }

    // Sort Ascending (Fewest is "best" for this specific metric request)
    return results.sort((a, b) => a.value - b.value);
}

// NEW: Least Recent Host (Active Players Only)
function getLeastRecentHost(games, activePlayersSet) {
    // Only care about games where isHome = true
    // We want the LAST date (Season + Week) a player hosted.
    
    const lastHosted = {}; // Key: Player -> { dateStr, timestamp }

    games.forEach(g => {
        if (!g.isHome) return;
        
        // Simple timestamp for sorting: Season * 100 + WeekIndex
        // Week index for Playoff1 (20), Playoff2 (21), Champ (22) handles order
        const timestamp = (g.season * 100) + g.weekIndex;
        
        if (!lastHosted[g.player] || timestamp > lastHosted[g.player].timestamp) {
            lastHosted[g.player] = {
                dateStr: `${g.season} ${g.weekLabel}`,
                timestamp: timestamp
            };
        }
    });

    const results = [];
    
    // Iterate all active players
    activePlayersSet.forEach(player => {
        if (lastHosted[player]) {
            results.push({
                player: player,
                value: lastHosted[player].dateStr,
                raw: lastHosted[player].timestamp
            });
        } else {
            // Player has NEVER hosted
            results.push({
                player: player,
                value: "Never",
                raw: 0 // Sort to top (or bottom depending on asc/desc)
            });
        }
    });

    // Sort Ascending by timestamp (Oldest date first)
    return results.sort((a, b) => a.raw - b.raw);
}

function getPlacementRates(games, filterFn, minGames = 1) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        if (records.length < minGames) continue;
        const count = records.filter(filterFn).length;
        const total = records.length;
        const pct = (count / total) * 100;
        
        results.push({ 
            player, 
            value: pct.toFixed(1) + '%', 
            raw: pct, 
            extra: `(${count}/${total})` 
        });
    }
    return results.sort((a, b) => b.raw - a.raw);
}

// Updated streak logic with formatted date strings
// activePlayersSet is optional, if provided, checks if player is currently in league
function getStreaks(games, hitFn, activePlayersSet) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        // Chronological order
        records.sort((a,b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));
        
        let current = 0;
        let max = 0;
        let startDate = "";
        let endDate = "";
        let tempStart = "";

        records.forEach((g, index) => {
            if (hitFn(g)) {
                if (current === 0) {
                    tempStart = `${g.season} ${g.weekLabel}`;
                }
                current++;
                if (current > max) {
                    max = current;
                    startDate = tempStart;
                    endDate = `${g.season} ${g.weekLabel}`;
                }
            } else {
                current = 0;
            }
        });
        
        // Check if the current active streak matches the max streak
        let active = 0;
        for (let i = records.length - 1; i >= 0; i--) {
            if (hitFn(records[i])) active++;
            else break;
        }
        
        let isActive = (max > 0 && max === active);
        
        // Force inactive if player is retired
        if (activePlayersSet && !activePlayersSet.has(player)) {
            isActive = false;
        }

        // Format Context string
        let context = "";
        if (max > 0) {
            if (isActive) {
                // If active, show Start - Present
                context = `(${startDate} - Present)`;
            } else if (max === 1) {
                // Single game streak
                context = `(${startDate})`;
            } else {
                // Completed streak
                context = `(${startDate} - ${endDate})`;
            }
        }
        
        results.push({ player, value: max, isActive: isActive, extra: context, startDate: startDate, endDate: endDate });
    }
    return results.sort((a, b) => b.value - a.value);
}

// Only returns currently active streaks for active players
function getActiveStreaks(games, hitFn, activePlayersSet) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        // If player is retired, skip entirely for "Current Active Streak" lists
        if (activePlayersSet && !activePlayersSet.has(player)) continue;

        records.sort((a,b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));
        let current = 0;
        let startDate = "";

        for (let i = records.length - 1; i >= 0; i--) {
            if (hitFn(records[i])) {
                current++;
                startDate = `${records[i].season} ${records[i].weekLabel}`; // Updates to earliest date in streak
            }
            else break;
        }

        if (current > 0) {
            let context = `(${startDate} - Present)`;
            if (current === 1) context = `(${startDate})`;

            results.push({ player, value: current, isActive: true, extra: context });
        }
    }
    return results.sort((a, b) => b.value - a.value);
}

// =============================================
// NEW: Gender Streak Logic
// =============================================

function getGenderStreaks(games, targetGender, gamesById, activePlayersSet, activeOnly) {
    const grouped = groupByPlayer(games);
    const results = [];

    for (const [player, records] of Object.entries(grouped)) {
        // Skip retired players only when listing active streaks (same as other active streak boards)
        if (activeOnly && activePlayersSet && !activePlayersSet.has(player)) continue;

        records.sort((a,b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));

        let current = 0;
        let max = 0;
        let startDate = "";
        let endDate = "";
        let tempStart = "";
        let activeStartDate = "";

        // Iterate games
        for (const g of records) {
            // 1. Get Opponents for this game
            const allInGame = gamesById[g.gameId] || [];
            const opponents = allInGame.filter(p => p.player !== player);
            
            // 2. Filter for Target Gender
            const targetOpponents = opponents.filter(op => GENDER_MAP[op.player] === targetGender);

            // 3. Skip games where no target gender was present
            // The streak does not break, but it does not increment.
            if (targetOpponents.length === 0) {
                continue;
            }

            // 4. Check Result (Did I lose to ANY of them?)
            // Lost = My Place > Their Place (Since 1 is best)
            // e.g. I got 3rd, She got 2nd. 3 > 2 => Lost.
            const lostToTarget = targetOpponents.some(op => g.place > op.place);

            if (!lostToTarget) {
                // Streak Continues
                if (current === 0) {
                    tempStart = `${g.season} ${g.weekLabel}`;
                }
                current++;
                
                // Track max
                if (current > max) {
                    max = current;
                    startDate = tempStart;
                    endDate = `${g.season} ${g.weekLabel}`;
                }
            } else {
                // Streak Breaks
                current = 0;
            }
        }
        
        // Finalize Logic
        let finalValue = activeOnly ? current : max;
        
        // If Active Only, capture the start date of the CURRENT streak
        // We need to backtrack to find when the current streak started if we didn't track it explicitly
        // Simplified: If current > 0, we can use tempStart which holds the start of the current running streak
        
        let isActive = false;
        
        if (activeOnly) {
            if (current > 0) {
                isActive = true;
                const context = current === 1 ? `(${tempStart})` : `(${tempStart} - Present)`;
                results.push({ player, value: current, isActive: true, extra: context, startDate: tempStart, endDate: 'Present' });
            }
        } else {
             // For All-Time Max
             // Determine if the MAX streak is also the ACTIVE streak
             if (max > 0 && current === max) {
                 // Check if player is actually active in league
                 if (!activePlayersSet || activePlayersSet.has(player)) {
                     isActive = true;
                 }
             }

             let context = "";
             if (max > 0) {
                 if (isActive) {
                      context = max === 1 ? `(${startDate})` : `(${startDate} - Present)`;
                 } else {
                      context = max === 1 ? `(${startDate})` : `(${startDate} - ${endDate})`;
                 }
                 results.push({ player, value: max, isActive: isActive, extra: context, startDate: startDate, endDate: endDate });
             }
        }
    }
    return results.sort((a, b) => b.value - a.value);
}

// Single Season Wrapper for Gender Streaks
function getSingleSeasonGenderStreaks(games, targetGender, gamesById, activePlayersSet) {
    const bySeason = {};
    games.forEach(g => {
        if (!bySeason[g.season]) bySeason[g.season] = [];
        bySeason[g.season].push(g);
    });

    const currentSeason = Math.max(...games.map(g => g.season));
    const results = [];

    for (const [season, seasonGames] of Object.entries(bySeason)) {
        const streaks = getGenderStreaks(seasonGames, targetGender, gamesById, activePlayersSet, false);
        
        streaks.forEach(r => {
            const isSeasonActive = parseInt(season) === currentSeason;
            // Only mark active if it's the current season AND the streak is still alive
            const finalActive = r.isActive && isSeasonActive;
            
            let context = "";
            if (finalActive) {
                 context = r.value === 1 ? `(${r.startDate})` : `(${r.startDate} - Present)`;
            } else {
                 context = r.value === 1 ? `(${r.startDate})` : `(${r.startDate} - ${r.endDate})`;
            }

            results.push({ 
                player: r.player, 
                value: r.value, 
                extra: context, 
                isActive: finalActive 
            });
        });
    }
    
    // Sort and Deduplicate players (keep their best season)
    // Actually, usually we want to see the top records regardless of player duplication?
    // Existing getSingleSeasonStreaks keeps all.
    return results.sort((a, b) => b.value - a.value);
}


function getWinRates(games, isHome, minGames = 1) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        const subset = records.filter(g => g.isHome === isHome);
        const total = subset.length;
        if (total < minGames) continue;

        const wins = subset.filter(g => g.place === 1).length;
        const pct = (wins / total) * 100;
        
        results.push({ 
            player, 
            value: pct.toFixed(1) + '%', 
            raw: pct,
            extra: `(${wins}/${total})` 
        });
    }
    return results.sort((a, b) => b.raw - a.raw);
}

function getLocationPercent(games, isHome, minGames = 1) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        const total = records.length;
        if (total < minGames) continue;
        
        const subset = records.filter(g => g.isHome === isHome).length;
        const pct = (subset / total) * 100;
        
        results.push({ 
            player, 
            value: pct.toFixed(1) + '%', 
            raw: pct,
            extra: `(${subset}/${total})` 
        });
    }
    return results.sort((a, b) => b.raw - a.raw);
}

function getPlayerSeasonStats(games) {
    const map = {};
    games.forEach(g => {
        const key = `${g.player}::${g.season}`;
        if (!map[key]) {
            map[key] = {
                player: g.player,
                season: g.season,
                points: 0,
                place_1: 0, place_2: 0, place_3: 0, place_4: 0
            };
        }
        map[key].points += g.points;
        map[key][`place_${g.place}`]++;
    });
    return Object.values(map);
}

function getRankedRecords(list, field) {
    const mapped = list.map(item => ({
        player: item.player,
        value: item[field],
        extra: `(${item.season})`
    }));
    return mapped.sort((a, b) => b.value - a.value);
}

function getSingleSeasonStreaks(games, hitFn, activePlayersSet) {
    const bySeason = {};
    games.forEach(g => {
        if (!bySeason[g.season]) bySeason[g.season] = [];
        bySeason[g.season].push(g);
    });

    // Determine current season to ensure historic season streaks aren't marked active
    const currentSeason = Math.max(...games.map(g => g.season));

    const results = [];
    for (const [season, seasonGames] of Object.entries(bySeason)) {
        // Reuse getStreaks logic to capture isActive flag per season if needed,
        // though isActive usually implies "currently in this specific season"
        const seasonStreaks = getStreaks(seasonGames, hitFn, activePlayersSet);
        seasonStreaks.forEach(r => {
            // Only mark as active if it is the current season
            const isSeasonActive = parseInt(season) === currentSeason;
            const finalActive = r.isActive && isSeasonActive;

            // FIX: Ensure past season streaks have explicit dates, never "Present"
            let context = r.extra;
            if (r.isActive && !isSeasonActive) {
                // If getStreaks thought it was active (end of data provided), but it's an old season,
                // rewrite context to be specific dates.
                if (r.value === 1) {
                    context = `(${r.startDate})`;
                } else {
                    context = `(${r.startDate} - ${r.endDate})`;
                }
            } else if (finalActive) {
                // It IS active in the current season
                 if (r.value === 1) {
                    context = `(${r.startDate} - Present)`;
                } else {
                    context = `(${r.startDate} - Present)`;
                }
            }

            if (r.value > 0) results.push({ player: r.player, value: r.value, extra: context, isActive: finalActive });
        });
    }
    return results.sort((a, b) => b.value - a.value);
}

// CHANGED: From Single Season to Career Cumulative
function getFastestToCareerPoints(games, target) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        // Sort chronologically across ALL seasons for career stats
        records.sort((a,b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));
        
        let pts = 0;
        let count = 0;
        let reached = false;
        
        for (const g of records) {
            pts += g.points;
            count++;
            if (pts >= target) {
                reached = true;
                results.push({ player, value: count, extra: `` }); // Count is number of games
                break;
            }
        }
    }
    return results.sort((a, b) => a.value - b.value); // Sort Ascending (fewest games)
}

function getRookieSeasonRecords(games) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        const minSeason = Math.min(...records.map(r => r.season));
        const rookieGames = records.filter(r => r.season === minSeason);
        const total = rookieGames.reduce((sum, g) => sum + g.points, 0);
        results.push({ player, value: total, extra: `(${minSeason})`, season: minSeason }); // Added season property
    }
    return results.sort((a, b) => b.value - a.value);
}

// NEW: Sophomore Records
function getSophomoreSeasonRecords(games) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        const seasons = [...new Set(records.map(r => r.season))].sort((a, b) => a - b);
        
        // Must have played at least 2 seasons to have a sophomore season
        if (seasons.length < 2) continue;
        
        const sophSeason = seasons[1]; // 2nd season
        const rookieSeason = seasons[0]; // 1st season
        
        const sophGames = records.filter(r => r.season === sophSeason);
        const total = sophGames.reduce((sum, g) => sum + g.points, 0);
        
        results.push({ 
            player, 
            value: total, 
            extra: `(${sophSeason})`,
            rookieSeason: rookieSeason // Store for filtering later
        }); 
    }
    return results.sort((a, b) => b.value - a.value);
}

// NEW: Biggest Point Jump
function getBiggestPointJumps(games, seasonsRegComplete) {
    const grouped = groupByPlayer(games);
    const results = [];
    
    // Determine the latest season
    const allSeasons = [...new Set(games.map(g => g.season))];
    const latestSeason = Math.max(...allSeasons);

    for (const [player, records] of Object.entries(grouped)) {
        // Calculate total points per season
        const seasonPoints = {};
        records.forEach(r => {
            if (!seasonPoints[r.season]) seasonPoints[r.season] = 0;
            seasonPoints[r.season] += r.points;
        });
        
        const seasons = Object.keys(seasonPoints).sort();
        
        // Compare consecutive seasons
        for (let i = 1; i < seasons.length; i++) {
            const currentYear = parseInt(seasons[i]);
            const prevYear = parseInt(seasons[i-1]);
            
            // Check if currentYear is the latest season
            if (currentYear === latestSeason) {
                if (seasonsRegComplete && !seasonsRegComplete.has(currentYear)) {
                    continue;
                }
            }

            // Only compare consecutive years (e.g., 2023 to 2024, not 2022 to 2024)
            if (currentYear === prevYear + 1) {
                const diff = seasonPoints[currentYear] - seasonPoints[prevYear];
                if (diff > 0) { // Only care about positive jumps (improvement)
                    results.push({
                        player,
                        value: `+${diff}`,
                        raw: diff,
                        extra: `(${prevYear} to ${currentYear})`
                    });
                }
            }
        }
    }
    return results.sort((a, b) => b.raw - a.raw);
}

// NEW: Biggest Point Drops
function getBiggestPointDrops(games, seasonsRegComplete) {
    const grouped = groupByPlayer(games);
    const results = [];
    
    // Determine the latest season
    const allSeasons = [...new Set(games.map(g => g.season))];
    const latestSeason = Math.max(...allSeasons);
    
    for (const [player, records] of Object.entries(grouped)) {
        // Calculate total points per season
        const seasonPoints = {};
        records.forEach(r => {
            if (!seasonPoints[r.season]) seasonPoints[r.season] = 0;
            seasonPoints[r.season] += r.points;
        });
        
        const seasons = Object.keys(seasonPoints).sort();
        
        // Compare consecutive seasons
        for (let i = 1; i < seasons.length; i++) {
            const currentYear = parseInt(seasons[i]);
            const prevYear = parseInt(seasons[i-1]);
            
            // Check if currentYear is the latest season
            if (currentYear === latestSeason) {
                if (seasonsRegComplete && !seasonsRegComplete.has(currentYear)) {
                    continue;
                }
            }

            if (currentYear === prevYear + 1) {
                const diff = seasonPoints[currentYear] - seasonPoints[prevYear];
                if (diff < 0) { // Only care about negative drops
                    results.push({
                        player,
                        value: `${diff}`, // Already negative
                        raw: Math.abs(diff), // Sort by magnitude of drop
                        extra: `(${prevYear} to ${currentYear})`
                    });
                }
            }
        }
    }
    return results.sort((a, b) => b.raw - a.raw);
}

// NEW: Consistency (Standard Deviation of Placement)
function getPlacementConsistency(games, minGames) {
    const grouped = groupByPlayer(games);
    const results = [];

    for (const [player, records] of Object.entries(grouped)) {
        if (records.length < minGames) continue;

        const placements = records.map(r => r.place);
        const mean = placements.reduce((a, b) => a + b, 0) / placements.length;
        
        // Calculate standard deviation
        const squaredDiffs = placements.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / placements.length;
        const stdDev = Math.sqrt(avgSquaredDiff);

        results.push({ 
            player, 
            value: stdDev.toFixed(2), // Lower is more consistent
            raw: stdDev,
            extra: `(${records.length} games)` 
        });
    }
    // Sort Ascending (Lower Std Dev = Better Consistency)
    return results.sort((a, b) => a.raw - b.raw);
}

// NEW: Consistency (Standard Deviation of Season Total Points)
function getPointsConsistency(games, minSeasons) {
    const grouped = groupByPlayer(games);
    const results = [];

    for (const [player, records] of Object.entries(grouped)) {
        // Calculate totals for each season
        const seasonTotals = {};
        records.forEach(g => {
            if (!seasonTotals[g.season]) seasonTotals[g.season] = 0;
            seasonTotals[g.season] += g.points;
        });

        const totalsArray = Object.values(seasonTotals);
        
        if (totalsArray.length < minSeasons) continue;

        const mean = totalsArray.reduce((a, b) => a + b, 0) / totalsArray.length;
        
        // Calculate standard deviation
        const squaredDiffs = totalsArray.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / totalsArray.length;
        const stdDev = Math.sqrt(avgSquaredDiff);

        results.push({ 
            player, 
            value: stdDev.toFixed(2), // Lower is more consistent
            raw: stdDev,
            extra: `(${totalsArray.length} seasons)` 
        });
    }
    // Sort Ascending (Lower Std Dev = Better Consistency)
    return results.sort((a, b) => a.raw - b.raw);
}

// NEW: Most Common Matchups (Pairs)
function getMostCommonMatchups(games) {
    // 1. Group by unique Game Table ID
    // We used to group by Season|Week|Game|Location, but that merges multiple tables at same location/week.
    // We need to use the 'gameId' we added in parseSchedule.
    const gameGroups = {}; 
    
    games.forEach(g => {
        if (!gameGroups[g.gameId]) gameGroups[g.gameId] = [];
        gameGroups[g.gameId].push(g.player);
    });

    const pairCounts = {};

    // 2. Iterate groups and generate pairs
    Object.values(gameGroups).forEach(players => {
        // Sort players to ensure pair "A vs B" is same as "B vs A"
        players.sort();
        
        // Remove duplicates if any (though parseSchedule shouldn't produce them)
        const uniquePlayers = [...new Set(players)];

        for (let i = 0; i < uniquePlayers.length; i++) {
            for (let j = i + 1; j < uniquePlayers.length; j++) {
                const pair = `${uniquePlayers[i]} & ${uniquePlayers[j]}`;
                if (!pairCounts[pair]) pairCounts[pair] = 0;
                pairCounts[pair]++;
            }
        }
    });

    // 3. Convert to leaderboard format
    const results = Object.entries(pairCounts).map(([pair, count]) => ({
        player: pair, // "Player A & Player B"
        value: count
    }));

    return results.sort((a, b) => b.value - a.value);
}

// NEW: Least Played Matchups (Active Players Only)
function getLeastPlayedMatchups(games, activePlayersSet) {
    // 1. Map Weeks to Players to calculate "Chances"
    const weekMap = {}; // Key: "Season|Week" -> Set of Players
    games.forEach(g => {
        const weekKey = `${g.season}|${g.weekLabel}`;
        if (!weekMap[weekKey]) weekMap[weekKey] = new Set();
        weekMap[weekKey].add(g.player);
    });

    // 2. Generate all unique pairs of ACTIVE players
    const activePlayers = Array.from(activePlayersSet).sort();
    const pairStats = {}; // Key: "P1 & P2" -> { count: 0, chances: 0 }
    
    for (let i = 0; i < activePlayers.length; i++) {
        for (let j = i + 1; j < activePlayers.length; j++) {
            const p1 = activePlayers[i];
            const p2 = activePlayers[j];
            const pair = `${p1} & ${p2}`;
            
            // Calculate chances (both played in same week)
            let chances = 0;
            for (const weekPlayers of Object.values(weekMap)) {
                if (weekPlayers.has(p1) && weekPlayers.has(p2)) {
                    chances++;
                }
            }
            
            pairStats[pair] = { count: 0, chances: chances };
        }
    }

    // 3. Count actual matchups
    // Group by unique Game Table ID
    const gameGroups = {}; 
    games.forEach(g => {
        if (!gameGroups[g.gameId]) gameGroups[g.gameId] = [];
        gameGroups[g.gameId].push(g.player);
    });

    Object.values(gameGroups).forEach(players => {
        const uniquePlayers = [...new Set(players)];
        // Only count if both players are active
        for (let i = 0; i < uniquePlayers.length; i++) {
            for (let j = i + 1; j < uniquePlayers.length; j++) {
                const p1 = uniquePlayers[i];
                const p2 = uniquePlayers[j];
                
                if (activePlayersSet.has(p1) && activePlayersSet.has(p2)) {
                    const sortedPair = [p1, p2].sort();
                    const pairKey = `${sortedPair[0]} & ${sortedPair[1]}`;
                    if (pairStats[pairKey]) {
                        pairStats[pairKey].count++;
                    }
                }
            }
        }
    });

    // 4. Filter for 1 or fewer times AND format output
    const results = [];
    for (const [pair, stats] of Object.entries(pairStats)) {
        if (stats.count <= 1) {
            results.push({
                player: pair,
                value: stats.count,
                extra: `(${stats.chances} chances)`
            });
        }
    }

    // Sort Ascending (0 then 1), tie-break with most chances (descending) to show "missed opportunities"
    return results.sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value; // Primary: Matchups (Asc)
        // Secondary: Chances (Desc) - "Never played but had 20 chances" is more interesting than "Never played, 1 chance"
        const chancesA = parseInt(a.extra.match(/\d+/)[0]);
        const chancesB = parseInt(b.extra.match(/\d+/)[0]);
        return chancesB - chancesA;
    });
}

// NEW: Longest Matchup Droughts (Active Players)
function getMatchupDroughts(games, activePlayersSet) {
    // 1. Identify all unique weeks chronologically
    // Use a map to store games per week to check matchups later
    const gamesByWeek = {}; // weekKey -> [games]
    const weekKeys = []; // To keep order
    
    // Also map players to weeks to calculate "chances" for never-met pairs
    const playerWeeks = {}; // Player -> Set of WeekKeys

    games.forEach(g => {
        const weekKey = `${g.season}|${g.weekIndex}|${g.weekLabel}`;
        
        if (!gamesByWeek[weekKey]) {
            gamesByWeek[weekKey] = [];
            weekKeys.push(weekKey);
        }
        gamesByWeek[weekKey].push(g);
        
        if (!playerWeeks[g.player]) playerWeeks[g.player] = new Set();
        playerWeeks[g.player].add(weekKey);
    });

    // Dedup weekKeys (preserve order)
    const uniqueWeeks = [...new Set(weekKeys)];
    const currentWeekIndex = uniqueWeeks.length - 1;

    // 2. Generate Pairs
    const activePlayers = Array.from(activePlayersSet).sort();
    const results = [];

    for (let i = 0; i < activePlayers.length; i++) {
        for (let j = i + 1; j < activePlayers.length; j++) {
            const p1 = activePlayers[i];
            const p2 = activePlayers[j];
            
            // Find last matchup index
            let lastMatchupIdx = -1;
            let lastMatchupLabel = "";

            // Iterate backwards through weeks to find LAST meeting
            for (let w = currentWeekIndex; w >= 0; w--) {
                const weekKey = uniqueWeeks[w];
                const weekGames = gamesByWeek[weekKey];
                
                // Group by table/gameId within this week
                const tables = {};
                weekGames.forEach(g => {
                    if (!tables[g.gameId]) tables[g.gameId] = [];
                    tables[g.gameId].push(g.player);
                });

                // Check if pair existed in any table
                let pairFound = false;
                for (const players of Object.values(tables)) {
                    if (players.includes(p1) && players.includes(p2)) {
                        pairFound = true;
                        break;
                    }
                }

                if (pairFound) {
                    lastMatchupIdx = w;
                    const parts = weekKey.split('|');
                    lastMatchupLabel = `${parts[0]} ${parts[2]}`;
                    break;
                }
            }

            if (lastMatchupIdx !== -1) {
                // They have met before
                const droughtWeeks = currentWeekIndex - lastMatchupIdx;
                
                // Filter: Exclude if happened within last 6 weeks (drought <= 6)
                if (droughtWeeks > 6) {
                    results.push({
                        player: `${p1} & ${p2}`,
                        value: droughtWeeks,
                        extra: `(Last: ${lastMatchupLabel})`
                    });
                }
            } else {
                // They have NEVER met
                // Calculate "Chances" (weeks where BOTH played but not each other)
                // Since they never met, every week they both played is a missed chance.
                let chances = 0;
                const p1Weeks = playerWeeks[p1] || new Set();
                const p2Weeks = playerWeeks[p2] || new Set();
                
                uniqueWeeks.forEach(wk => {
                    if (p1Weeks.has(wk) && p2Weeks.has(wk)) {
                        chances++;
                    }
                });

                if (chances > 6) { // Consistent filter with existing logic
                    results.push({
                        player: `${p1} & ${p2}`,
                        value: chances, // Drought is number of missed chances
                        extra: `(Never Met - ${chances} chances)`
                    });
                }
            }
        }
    }

    // Sort Descending (Longest drought first)
    return results.sort((a, b) => b.value - a.value);
}

function getPlayoffAppearances(postGames) {
    const map = {};
    postGames.forEach(g => {
        if (!map[g.player]) map[g.player] = new Set();
        map[g.player].add(g.season);
    });
    const results = [];
    for (const [player, seasons] of Object.entries(map)) {
        results.push({ player, value: seasons.size });
    }
    return results.sort((a, b) => b.value - a.value);
}

// NEW: Championship Appearances
function getChampionshipAppearances(postGames) {
    const champGames = postGames.filter(g => g.weekLabel.includes('Championship'));
    return getCounts(champGames, () => true); // Count all appearances
}

// NEW: Championship Titles (Wins)
function getChampionshipTitles(postGames) {
    const champGames = postGames.filter(g => g.weekLabel.includes('Championship'));
    return getCounts(champGames, g => g.place === 1); // Count only wins
}

function getConsecutivePlayoffAppearances(postGames, activePlayersSet) {
    const map = {};
    postGames.forEach(g => {
        if (!map[g.player]) map[g.player] = new Set();
        map[g.player].add(g.season);
    });
    const results = [];
    for (const [player, seasonSet] of Object.entries(map)) {
        const sorted = [...seasonSet].sort((a,b) => a-b);
        let max = 0;
        let current = 0;
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i] === sorted[i-1] + 1) current++;
            else current = 1;
            if (current > max) max = current;
        }
        
        // Is this streak current?
        const lastSeason = sorted[sorted.length-1];
        const maxYearInSet = Math.max(...postGames.map(g => g.season));
        
        let isActive = (lastSeason === maxYearInSet && current === max);
        
        // Enforce retired logic
        if (activePlayersSet && !activePlayersSet.has(player)) {
            isActive = false;
        }
        
        results.push({ player, value: max, isActive });
    }
    return results.sort((a, b) => b.value - a.value);
}

function getWeeklyAverages(games, weekNum, minRequiredGames) {
    const targetGames = games.filter(g => {
        if (!g.weekLabel.startsWith("Week")) return false;
        const num = parseInt(g.weekLabel.split(' ')[1]);
        return num === weekNum;
    });
    const grouped = groupByPlayer(targetGames);
    const results = [];
    const minGames = minRequiredGames; // Enforce minimum 2 games for cross-season weekly stats

    for (const [player, records] of Object.entries(grouped)) {
        if (records.length < minGames) continue;
        const sum = records.reduce((acc, r) => acc + r.points, 0);
        const avg = sum / records.length;
        results.push({ player, value: avg.toFixed(2), raw: avg, extra: `(${records.length} games)` });
    }
    results.sort((a, b) => b.raw - a.raw);
    return results;
}

// NEW: Historic Performances / playoff-path calculations (SCOPE_METRICS tab)
function calculateSeasonMetrics(allGames) {
    const regGames = allGames.filter(g => !g.isPostSeason && !g.isTieBreak);
    const seasons = {};
    
    // Group reg season data
    regGames.forEach(g => {
        if (!seasons[g.season]) seasons[g.season] = { players: {}, playoffQualifiers: new Set() };
        if (!seasons[g.season].players[g.player]) seasons[g.season].players[g.player] = { 
            total: 0, 
            week2: 0,
            week3: 0,
            week4: 0 
        };
        
        const pData = seasons[g.season].players[g.player];
        pData.total += g.points;
        if (g.weekIndex <= 2) pData.week2 += g.points;
        if (g.weekIndex <= 3) pData.week3 += g.points;
        if (g.weekIndex <= 4) pData.week4 += g.points;
    });

    const regSeasonFinishedSeasons = buildSeasonsWithRegularSeasonComplete(regGames);
    const qualifiersBySeason = buildPlayoffQualifiersBySeason(allGames, regGames);
    for (const [season, data] of Object.entries(seasons)) {
        const sn = parseInt(season, 10);
        const q = qualifiersBySeason[sn];
        data.playoffQualifiers = q ? new Set(q) : new Set();
    }

    const lowestQualifiers = [];
    
    // Worst Starts Arrays
    const worstStarts2 = [];
    const worstStarts3 = [];
    const worstStarts4 = [];
    
    // Best Misses Arrays
    const bestMisses2 = [];
    const bestMisses3 = [];
    const bestMisses4 = [];

    for (const [season, data] of Object.entries(seasons)) {
        if (!regSeasonFinishedSeasons.has(parseInt(season, 10))) continue;

        let seasonMinQual = 999;
        let seasonMinPlayer = "";

        // Iterate players in that season
        for (const [player, stats] of Object.entries(data.players)) {
            const madePlayoffs = data.playoffQualifiers.has(player);
            
            // 1. Lowest Total to Qualify
            if (madePlayoffs) {
                if (stats.total < seasonMinQual) {
                    seasonMinQual = stats.total;
                    seasonMinPlayer = player;
                }
                
                // 2. Worst Starts to Make It
                worstStarts2.push({ 
                    player, value: stats.week2, extra: `(${season} - Final: ${stats.total})`, raw: stats.week2 
                });
                worstStarts3.push({ 
                    player, value: stats.week3, extra: `(${season} - Final: ${stats.total})`, raw: stats.week3 
                });
                worstStarts4.push({ 
                    player, value: stats.week4, extra: `(${season} - Final: ${stats.total})`, raw: stats.week4 
                });
                
            } else {
                // 3. Best Starts to Miss It
                // Usually "Start" implies they played. Let's assume > 0 points or > 0 games played by week X
                if (stats.week2 > 0) {
                    bestMisses2.push({
                        player, value: stats.week2, extra: `(${season} - Final: ${stats.total})`, raw: stats.week2
                    });
                }
                if (stats.week3 > 0) {
                    bestMisses3.push({
                        player, value: stats.week3, extra: `(${season} - Final: ${stats.total})`, raw: stats.week3
                    });
                }
                if (stats.week4 > 0) {
                    bestMisses4.push({
                        player, value: stats.week4, extra: `(${season} - Final: ${stats.total})`, raw: stats.week4
                    });
                }
            }
        }
        if (seasonMinPlayer) {
            lowestQualifiers.push({ 
                player: seasonMinPlayer, 
                value: seasonMinQual, 
                extra: `(${season})`,
                raw: seasonMinQual 
            });
        }
    }

    // Sort results
    lowestQualifiers.sort((a,b) => a.raw - b.raw);
    
    worstStarts2.sort((a,b) => a.raw - b.raw);
    worstStarts3.sort((a,b) => a.raw - b.raw);
    worstStarts4.sort((a,b) => a.raw - b.raw);
    
    bestMisses2.sort((a,b) => b.raw - a.raw);
    bestMisses3.sort((a,b) => b.raw - a.raw);
    bestMisses4.sort((a,b) => b.raw - a.raw);

    return { 
        lowestQualifiers, 
        worstStarts2, worstStarts3, worstStarts4,
        bestMisses2, bestMisses3, bestMisses4
    };
}

// NEW: The Opener & Closer (Splits)
function getSplitPerformance(games, weeksArray, minGames) {
    // Filter games to only included weeks
    const splitGames = games.filter(g => weeksArray.includes(g.weekIndex));
    const grouped = groupByPlayer(splitGames);
    const results = [];

    for (const [player, records] of Object.entries(grouped)) {
        if (records.length < minGames) continue;
        const avg = records.reduce((a,b)=>a+b.points,0) / records.length;
        results.push({
            player,
            value: avg.toFixed(2),
            raw: avg,
            extra: `(${records.length} games)`
        });
    }
    return results.sort((a,b) => b.raw - a.raw);
}

// NEW: Worst Enemies (Opponent Impact)
function getWorstEnemies(games) {
    // For each player, find their average score vs specific opponents vs their global average
    // Actually, simple "Avg Points when playing against X" is usually enough.
    // We want the PAIR (Player, Enemy) where Player scores lowest.
    
    // 1. Group games by ID
    const tables = {};
    games.forEach(g => {
        if(!tables[g.gameId]) tables[g.gameId] = [];
        tables[g.gameId].push(g); // Store full game obj to get points
    });

    const enemyStats = {}; // Key: "Player|Enemy" -> { totalPts, games }

    Object.values(tables).forEach(tableGames => {
        // For every player in this game...
        for (let i = 0; i < tableGames.length; i++) {
            const p1 = tableGames[i];
            // ... against every other player (Enemy)
            for (let j = 0; j < tableGames.length; j++) {
                if (i === j) continue;
                const enemy = tableGames[j];
                
                const key = `${p1.player}' against  ${enemy.player}`;
                if (!enemyStats[key]) enemyStats[key] = { pts: 0, games: 0 };
                enemyStats[key].pts += p1.points;
                enemyStats[key].games++;
            }
        }
    });

    const results = [];
    for (const [key, stats] of Object.entries(enemyStats)) {
        if (stats.games < 3) continue; // Min 3 games
        const avg = stats.pts / stats.games;
        // We want LOWEST avg
        results.push({
            player: key,
            value: avg.toFixed(2),
            raw: avg,
            extra: `(${stats.games} games)`
        });
    }

    return results.sort((a,b) => a.raw - b.raw); // Lowest score first
}

// NEW: Best Duo (Combined Average)
function getBestDuos(games) {
    const tables = {};
    games.forEach(g => {
        if(!tables[g.gameId]) tables[g.gameId] = [];
        tables[g.gameId].push(g);
    });

    const duoStats = {}; // Key: "P1 & P2" -> { totalPts, games }

    Object.values(tables).forEach(tableGames => {
        const players = tableGames.sort((a,b) => a.player.localeCompare(b.player)); // Sort to dedup P1/P2 order
        
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1 = players[i];
                const p2 = players[j];
                const key = `${p1.player} & ${p2.player}`;
                
                if (!duoStats[key]) duoStats[key] = { pts: 0, games: 0 };
                duoStats[key].pts += (p1.points + p2.points); // Sum of both
                duoStats[key].games++;
            }
        }
    });

    const results = [];
    for (const [key, stats] of Object.entries(duoStats)) {
        if (stats.games < 5) continue; // Min 5 games
        // Average COMBINED score
        const avg = stats.pts / stats.games;
        results.push({
            player: key,
            value: avg.toFixed(2),
            raw: avg,
            extra: `(${stats.games} games)`
        });
    }

    return results.sort((a,b) => b.raw - a.raw);
}

// NEW: Helper to filter dataset by Timeframe (Season or Games)
function filterDataset(games, type, value, maxSeason) {
    if (type === 'season') {
        const startSeason = Math.max(0, maxSeason - value + 1);
        return games.filter(g => g.season >= startSeason);
    } else if (type === 'games') {
        // Group by player, sort chronological, take top N
        const grouped = groupByPlayer(games);
        let result = [];
        for (const records of Object.values(grouped)) {
            records.sort((a,b) => (b.season - a.season) || (b.weekIndex - a.weekIndex)); // Descending
            const subset = records.slice(0, value);
            result = result.concat(subset);
        }
        return result;
    }
    return games;
}

/** focal player -> opponent -> { pts: sum of focal's points, games } */
function buildOpponentStatsByPlayer(games) {
    const tables = {};
    games.forEach(g => {
        if (!tables[g.gameId]) tables[g.gameId] = [];
        tables[g.gameId].push(g);
    });
    const byPlayer = {};
    Object.values(tables).forEach(tableGames => {
        for (let i = 0; i < tableGames.length; i++) {
            const p1 = tableGames[i];
            for (let j = 0; j < tableGames.length; j++) {
                if (i === j) continue;
                const enemy = tableGames[j];
                if (!byPlayer[p1.player]) byPlayer[p1.player] = {};
                if (!byPlayer[p1.player][enemy.player]) {
                    byPlayer[p1.player][enemy.player] = { pts: 0, games: 0 };
                }
                byPlayer[p1.player][enemy.player].pts += p1.points;
                byPlayer[p1.player][enemy.player].games++;
            }
        }
    });
    return byPlayer;
}

/** focal player -> partner at same table -> { pts: sum of combined pts per game, games } */
function buildDuoStatsByPlayer(games) {
    const tables = {};
    games.forEach(g => {
        if (!tables[g.gameId]) tables[g.gameId] = [];
        tables[g.gameId].push(g);
    });
    const byPlayer = {};
    Object.values(tables).forEach(tableGames => {
        const players = [...tableGames].sort((a, b) => a.player.localeCompare(b.player));
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1 = players[i];
                const p2 = players[j];
                const combined = p1.points + p2.points;
                if (!byPlayer[p1.player]) byPlayer[p1.player] = {};
                if (!byPlayer[p1.player][p2.player]) {
                    byPlayer[p1.player][p2.player] = { pts: 0, games: 0 };
                }
                byPlayer[p1.player][p2.player].pts += combined;
                byPlayer[p1.player][p2.player].games++;
                if (!byPlayer[p2.player]) byPlayer[p2.player] = {};
                if (!byPlayer[p2.player][p1.player]) {
                    byPlayer[p2.player][p1.player] = { pts: 0, games: 0 };
                }
                byPlayer[p2.player][p1.player].pts += combined;
                byPlayer[p2.player][p1.player].games++;
            }
        }
    });
    return byPlayer;
}

function getRankedOpponentsForPlayer(focalPlayer, oppByPlayer, minGames, highestFirst) {
    const stats = oppByPlayer[focalPlayer];
    if (!stats) return [];
    const results = [];
    for (const [opp, s] of Object.entries(stats)) {
        if (s.games < minGames) continue;
        const avg = s.pts / s.games;
        results.push({
            player: opp,
            value: avg.toFixed(2),
            raw: avg,
            extra: `(${s.games} games)`
        });
    }
    results.sort((a, b) => (highestFirst ? b.raw - a.raw : a.raw - b.raw));
    return results;
}

function getRankedPartnersForPlayer(focalPlayer, duoByPlayer, minGames, highestFirst) {
    const stats = duoByPlayer[focalPlayer];
    if (!stats) return [];
    const results = [];
    for (const [partner, s] of Object.entries(stats)) {
        if (s.games < minGames) continue;
        const avg = s.pts / s.games;
        results.push({
            player: partner,
            value: avg.toFixed(2),
            raw: avg,
            extra: `(${s.games} games)`
        });
    }
    results.sort((a, b) => (highestFirst ? b.raw - a.raw : a.raw - b.raw));
    return results;
}

/** Every opponent faced at least once; value = shared game count (regular season). */
function getOpponentGameCountsList(focalPlayer, oppByPlayer) {
    const stats = oppByPlayer[focalPlayer];
    if (!stats) return [];
    const results = [];
    for (const [opp, s] of Object.entries(stats)) {
        results.push({
            player: opp,
            value: s.games,
            raw: s.games,
            extra: ""
        });
    }
    results.sort((a, b) => b.raw - a.raw || String(a.player).localeCompare(String(b.player)));
    return results;
}

/**
 * Per focal player: pairwise matchup drought vs each **current** (active-season) opponent only,
 * same thresholds as getMatchupDroughts (&gt; 6 weeks since last shared table, or never met with &gt; 6 overlapping weeks).
 */
function getMatchupDroughtsForPlayer(focalPlayer, games, activePlayersSet) {
    const gamesByWeek = {};
    const weekKeys = [];
    const playerWeeks = {};

    games.forEach(g => {
        const weekKey = `${g.season}|${g.weekIndex}|${g.weekLabel}`;
        if (!gamesByWeek[weekKey]) {
            gamesByWeek[weekKey] = [];
            weekKeys.push(weekKey);
        }
        gamesByWeek[weekKey].push(g);
        if (!playerWeeks[g.player]) playerWeeks[g.player] = new Set();
        playerWeeks[g.player].add(weekKey);
    });

    const uniqueWeeks = [...new Set(weekKeys)];
    const currentWeekIndex = uniqueWeeks.length - 1;

    const allPlayers = new Set(games.map(g => g.player));
    allPlayers.delete(focalPlayer);

    const results = [];
    for (const opp of allPlayers) {
        if (!activePlayersSet || !activePlayersSet.has(opp)) continue;

        let lastMatchupIdx = -1;
        let lastMatchupLabel = "";

        for (let w = currentWeekIndex; w >= 0; w--) {
            const weekKey = uniqueWeeks[w];
            const weekGames = gamesByWeek[weekKey];
            const tables = {};
            weekGames.forEach(g => {
                if (!tables[g.gameId]) tables[g.gameId] = [];
                tables[g.gameId].push(g.player);
            });

            let pairFound = false;
            for (const players of Object.values(tables)) {
                if (players.includes(focalPlayer) && players.includes(opp)) {
                    pairFound = true;
                    break;
                }
            }

            if (pairFound) {
                lastMatchupIdx = w;
                const parts = weekKey.split("|");
                lastMatchupLabel = `${parts[0]} ${parts[2]}`;
                break;
            }
        }

        if (lastMatchupIdx !== -1) {
            const droughtWeeks = currentWeekIndex - lastMatchupIdx;
            if (droughtWeeks > 6) {
                results.push({
                    player: opp,
                    value: droughtWeeks,
                    raw: droughtWeeks,
                    extra: `(Last: ${lastMatchupLabel})`
                });
            }
        } else {
            let chances = 0;
            const wFocal = playerWeeks[focalPlayer] || new Set();
            const wOpp = playerWeeks[opp] || new Set();
            uniqueWeeks.forEach(wk => {
                if (wFocal.has(wk) && wOpp.has(wk)) chances++;
            });
            if (chances > 6) {
                results.push({
                    player: opp,
                    value: chances,
                    raw: chances,
                    extra: `(Never Met - ${chances} chances)`
                });
            }
        }
    }

    return results.sort((a, b) => b.raw - a.raw);
}

export function computeLeagueAnalytics(scheduleData) {
    if (!scheduleData || typeof scheduleData !== 'object') {
        return {
            metadata: { generated_at: new Date().toISOString(), description: 'League Analytics Data' },
            leaderboards: []
        };
    }

    jsonOutput = {
        metadata: {
            generated_at: new Date().toISOString(),
            description: 'League Analytics Data'
        },
        leaderboards: []
    };
    csvRows = ['Category,Subcategory,Scope,Rank,Player,Value,Context,IsActive'];

    try {
        const allGames = parseSchedule(scheduleData);
        if (!allGames.length) {
            return jsonOutput;
        }
        allGames.sort((a, b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));

        const leagueGames = allGames.filter(g => !g.isTieBreak);
        const tieBreakGames = allGames.filter(g => g.isTieBreak);

        const gamesById = {};
        leagueGames.forEach(g => {
            if (!gamesById[g.gameId]) gamesById[g.gameId] = [];
            gamesById[g.gameId].push(g);
        });

        const maxSeason = Math.max(...allGames.map(g => g.season));
        const activePlayersSet = new Set(
            allGames.filter(g => g.season === maxSeason).map(g => g.player)
        );

        const inauguralSeason = Math.min(...allGames.map(g => g.season));

        const regSeasonGames = leagueGames.filter(g => !g.isPostSeason);
        const postSeasonGames = leagueGames.filter(g => g.isPostSeason);

        const seasonsRegularSeasonComplete = buildSeasonsWithRegularSeasonComplete(regSeasonGames);

        const SCOPE_REG = 'All-Time (Regular Season)';
        const SCOPE_COM = 'All-Time (Reg and Post Season)';

        [SCOPE_COM, SCOPE_REG].forEach(scope => {
            const dataset = scope === SCOPE_REG ? regSeasonGames : leagueGames;

            processStat('Average Points per Game', 'Averages', scope, getAveragePoints(dataset));
            processStat('Elo Leaderboard', 'Ratings', scope, getEloLeaderboard(dataset, { activePlayersSet }));

            const minGames = 5;
            processStat(`% of 1st Place Finishes (Min ${minGames} Games)`, 'Placement Rates', scope, getPlacementRates(dataset, g => g.place === 1, minGames));
            processStat(`% of 2nd Place Finishes (Min ${minGames} Games)`, 'Placement Rates', scope, getPlacementRates(dataset, g => g.place === 2, minGames));
            processStat(`% of 3rd Place Finishes (Min ${minGames} Games)`, 'Placement Rates', scope, getPlacementRates(dataset, g => g.place === 3, minGames));
            processStat(`% of 4th Place Finishes (Min ${minGames} Games)`, 'Placement Rates', scope, getPlacementRates(dataset, g => g.place === 4, minGames));
            processStat(`% of Top Half Finishes (Min ${minGames} Games)`, 'Placement Rates', scope, getPlacementRates(dataset, g => g.place <= 2, minGames));
            processStat(`% of Bottom Half Finishes (Min ${minGames} Games)`, 'Placement Rates', scope, getPlacementRates(dataset, g => g.place >= 3, minGames));

            processStat('Points Leaders', 'Totals', scope, getSums(dataset, 'points'));
            processStat('Most 1st Places', 'Totals', scope, getCounts(dataset, g => g.place === 1));
            processStat('Most 2nd Places', 'Totals', scope, getCounts(dataset, g => g.place === 2));
            processStat('Most 3rd Places', 'Totals', scope, getCounts(dataset, g => g.place === 3));
            processStat('Most 4th Places', 'Totals', scope, getCounts(dataset, g => g.place === 4));
            processStat('Top Half Finishes (1st/2nd)', 'Totals', scope, getCounts(dataset, g => g.place <= 2));
            processStat('Bottom Half Finishes (3rd/4th)', 'Totals', scope, getCounts(dataset, g => g.place >= 3));

            processStat('Longest Win Streak', 'Streaks (All-Time)', scope, getStreaks(dataset, g => g.place === 1, activePlayersSet));
            processStat('Longest 2nd Place Streak', 'Streaks (All-Time)', scope, getStreaks(dataset, g => g.place === 2, activePlayersSet));
            processStat('Longest 3rd Place Streak', 'Streaks (All-Time)', scope, getStreaks(dataset, g => g.place === 3, activePlayersSet));
            processStat('Longest 4th Place Streak', 'Streaks (All-Time)', scope, getStreaks(dataset, g => g.place === 4, activePlayersSet));
            processStat('Longest Streak w/o 4th', 'Streaks (All-Time)', scope, getStreaks(dataset, g => g.place !== 4, activePlayersSet));
            processStat('Longest Winless Streak', 'Streaks (All-Time)', scope, getStreaks(dataset, g => g.place !== 1, activePlayersSet));
            processStat('Longest Top Half Streak (1st/2nd)', 'Streaks (All-Time)', scope, getStreaks(dataset, g => g.place <= 2, activePlayersSet));
            processStat('Longest Bottom Half Streak (3rd/4th)', 'Streaks (All-Time)', scope, getStreaks(dataset, g => g.place >= 3, activePlayersSet));
            processStat('Longest Streak Without Losing to a Man', 'Streaks (All-Time)', scope, getGenderStreaks(dataset, 'M', gamesById, activePlayersSet, false));
            processStat('Longest Streak Without Losing to a Woman', 'Streaks (All-Time)', scope, getGenderStreaks(dataset, 'F', gamesById, activePlayersSet, false));

            processStat('Active Win Streak', 'Streaks (Active)', scope, getActiveStreaks(dataset, g => g.place === 1, activePlayersSet));
            processStat('Active 2nd Place Streak', 'Streaks (Active)', scope, getActiveStreaks(dataset, g => g.place === 2, activePlayersSet));
            processStat('Active 3rd Place Streak', 'Streaks (Active)', scope, getActiveStreaks(dataset, g => g.place === 3, activePlayersSet));
            processStat('Active 4th Place Streak', 'Streaks (Active)', scope, getActiveStreaks(dataset, g => g.place === 4, activePlayersSet));
            processStat('Active Streak w/o 4th', 'Streaks (Active)', scope, getActiveStreaks(dataset, g => g.place !== 4, activePlayersSet));
            processStat('Active Winless Streak', 'Streaks (Active)', scope, getActiveStreaks(dataset, g => g.place !== 1, activePlayersSet));
            processStat('Active Top Half Streak', 'Streaks (Active)', scope, getActiveStreaks(dataset, g => g.place <= 2, activePlayersSet));
            processStat('Active Bottom Half Streak', 'Streaks (Active)', scope, getActiveStreaks(dataset, g => g.place >= 3, activePlayersSet));
            processStat('Active Streak Without Losing to a Man', 'Streaks (Active)', scope, getGenderStreaks(dataset, 'M', gamesById, activePlayersSet, true));
            processStat('Active Streak Without Losing to a Woman', 'Streaks (Active)', scope, getGenderStreaks(dataset, 'F', gamesById, activePlayersSet, true));

            [10, 20, 30, 40, 50, 60].forEach(target => {
                processStat(`Fastest to ${target} Career Points (# Games)`, 'Speed Records', scope, getFastestToCareerPoints(dataset, target));
            });
        });

        const SCOPE_SEASON = 'Single Season Records';
        const playerSeasons = getPlayerSeasonStats(regSeasonGames);

        processStat('Most Points (Season)', 'Totals', SCOPE_SEASON, getRankedRecords(playerSeasons, 'points'));
        processStat('Most 1st Places', 'Totals', SCOPE_SEASON, getRankedRecords(playerSeasons, 'place_1'));
        processStat('Most 2nd Places', 'Totals', SCOPE_SEASON, getRankedRecords(playerSeasons, 'place_2'));
        processStat('Most 3rd Places', 'Totals', SCOPE_SEASON, getRankedRecords(playerSeasons, 'place_3'));
        processStat('Most 4th Places', 'Totals', SCOPE_SEASON, getRankedRecords(playerSeasons, 'place_4'));

        processStat(
            'SOS-Adjusted Points per Game (Completed Regular Seasons)',
            'Averages',
            SCOPE_SEASON,
            getSeasonAdjustedPPGLeaderboard(regSeasonGames, seasonsRegularSeasonComplete)
        );

        processStat('Longest Win Streak (Season)', 'Streaks', SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place === 1, activePlayersSet));
        processStat('Longest Streak w/o 4th (Season)', 'Streaks', SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place !== 4, activePlayersSet));
        processStat('Longest Top Half Streak (Season)', 'Streaks', SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place <= 2, activePlayersSet));
        processStat('Longest Winless Streak (Season)', 'Streaks', SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place !== 1, activePlayersSet));
        processStat('Longest Bottom Half Streak (Season)', 'Streaks', SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place >= 3, activePlayersSet));

        processStat('Longest Streak Without Losing to a Man (Season)', 'Streaks', SCOPE_SEASON, getSingleSeasonGenderStreaks(regSeasonGames, 'M', gamesById, activePlayersSet));
        processStat('Longest Streak Without Losing to a Girl (Season)', 'Streaks', SCOPE_SEASON, getSingleSeasonGenderStreaks(regSeasonGames, 'F', gamesById, activePlayersSet));

        const rookieRecords = getRookieSeasonRecords(regSeasonGames);
        processStat('Most Points in Rookie Season (All-Time)', 'Rookie Records', SCOPE_SEASON, rookieRecords);

        const rookieRecordsExcl = rookieRecords.filter(r => r.season > inauguralSeason);
        processStat(`Most Points in Rookie Season (Excl. ${inauguralSeason})`, 'Rookie Records', SCOPE_SEASON, rookieRecordsExcl);

        const sophRecords = getSophomoreSeasonRecords(regSeasonGames);
        processStat('Best Sophomore Season (All-Time)', 'Rookie Records', SCOPE_SEASON, sophRecords);

        const sophRecordsExcl = sophRecords.filter(r => r.rookieSeason > inauguralSeason);
        processStat(`Best Sophomore Season (Excl. Class of ${inauguralSeason})`, 'Rookie Records', SCOPE_SEASON, sophRecordsExcl);

        const SCOPE_POST = 'Post Season Only';
        processStat('Most Playoff Appearances', 'Totals', SCOPE_POST, getPlayoffAppearances(postSeasonGames));
        processStat('Most Championship Appearances', 'Totals', SCOPE_POST, getChampionshipAppearances(postSeasonGames));
        processStat('Most Championship Titles', 'Totals', SCOPE_POST, getChampionshipTitles(postSeasonGames));

        processStat('Most Consecutive Playoff Appearances', 'Streaks', SCOPE_POST, getConsecutivePlayoffAppearances(postSeasonGames, activePlayersSet));

        processStat(
            'Most Tiebreaker Games Played',
            'Totals',
            SCOPE_POST,
            getTieBreakGamesPlayedLeaderboard(tieBreakGames, leagueGames)
        );

        const SCOPE_HOME = 'Locations';
        const homeDataset = leagueGames;

        processStat('Home Win % (Min 5 Home Games)', 'Averages', SCOPE_HOME, getWinRates(homeDataset, true, 5));
        processStat('Away Win % (Min 5 Away Games)', 'Averages', SCOPE_HOME, getWinRates(homeDataset, false, 5));
        processStat('Home vs Away Point Differential (Min 5 Games Each)', 'Averages', SCOPE_HOME, getLocationPointDifferential(homeDataset, 5));

        processStat('% of Games Played at Home (Min 5 Games)', 'Averages', SCOPE_HOME, getLocationPercent(homeDataset, true, 5));
        processStat('% of Games Played Away (Min 5 Games)', 'Averages', SCOPE_HOME, getLocationPercent(homeDataset, false, 5));

        processStat('Average Points at Home (Min 5 Home Games)', 'Averages', SCOPE_HOME, getLocationAveragePoints(homeDataset, true, 5));
        processStat('Average Points Away (Min 5 Away Games)', 'Averages', SCOPE_HOME, getLocationAveragePoints(homeDataset, false, 5));

        processStat('Most Games Hosted (By Location)', 'Totals', SCOPE_HOME, getLocationCounts(leagueGames));
        processStat('Most Home Games Played (By Player)', 'Totals', SCOPE_HOME, getCounts(homeDataset, g => g.isHome));

        processStat('Last Hosted (Active Players)', 'Totals', SCOPE_HOME, getLeastRecentHost(leagueGames, activePlayersSet));

        processStat('Most Wins at Home', 'Totals', SCOPE_HOME, getCounts(homeDataset, g => g.isHome && g.place === 1));
        processStat('Most Wins Away', 'Totals', SCOPE_HOME, getCounts(homeDataset, g => !g.isHome && g.place === 1));

        processStat('Most Home Games Played (Single Season)', 'Single Season', SCOPE_HOME, getMostHomeGamesInSeason(homeDataset));
        processStat('Fewest Home Games Played (Single Season)', 'Single Season', SCOPE_HOME, getFewestHomeGamesInSeason(homeDataset, seasonsRegularSeasonComplete));

        processStat('Most Games Played at Neutral Sites', 'Neutral Sites', SCOPE_HOME, getNeutralSiteCounts(leagueGames));
        processStat('Most Popular Neutral Sites', 'Neutral Sites', SCOPE_HOME, getNeutralSiteLocationCounts(leagueGames));

        const SCOPE_CROSS = 'Cross Season';
        const minRequiredGames = 2;
        for (let w = 1; w <= 6; w++) {
            processStat(`Best Week ${w} Performance Avg (Min ${minRequiredGames} games)`, 'Averages by Week', SCOPE_CROSS, getWeeklyAverages(leagueGames, w, minRequiredGames));
        }

        const openers = getSplitPerformance(regSeasonGames, [1, 2, 3], minRequiredGames);
        const closers = getSplitPerformance(regSeasonGames, [4, 5, 6], minRequiredGames);
        processStat(`The Opener (Avg Pts Wks 1-3) (Min ${minRequiredGames} games)`, 'Averages by Week', SCOPE_CROSS, openers);
        processStat(`The Closer (Avg Pts Wks 4-6) (Min ${minRequiredGames} games)`, 'Averages by Week', SCOPE_CROSS, closers);

        processStat('Biggest Points Jump (Season to Season)', 'Risers and Fallers', SCOPE_CROSS, getBiggestPointJumps(regSeasonGames, seasonsRegularSeasonComplete));
        processStat('Biggest Points Drop (Season to Season)', 'Risers and Fallers', SCOPE_CROSS, getBiggestPointDrops(regSeasonGames, seasonsRegularSeasonComplete));

        let consistencyDataset = regSeasonGames;
        if (!seasonsRegularSeasonComplete.has(maxSeason)) {
            consistencyDataset = regSeasonGames.filter(g => g.season !== maxSeason);
        }

        processStat('Most Consistent Finishers (Game Finishes Std Dev)', 'Risers and Fallers', SCOPE_CROSS, getPlacementConsistency(consistencyDataset, 5));

        processStat('Most Consistent Scorers (Season Pts Std Dev)', 'Risers and Fallers', SCOPE_CROSS, getPointsConsistency(consistencyDataset, 3));

        processStat('Most Common Matchups (Regular Season Only)', 'Rivalries', SCOPE_CROSS, getMostCommonMatchups(regSeasonGames));
        processStat('Least Played Matchups (Active Players Only - Max 1 Game)', 'Rivalries', SCOPE_CROSS, getLeastPlayedMatchups(leagueGames, activePlayersSet));
        processStat('Longest Matchup Droughts (> 6 Weeks Since Last Play)', 'Rivalries', SCOPE_CROSS, getMatchupDroughts(leagueGames, activePlayersSet));

        processStat('Best Duo (Combined Avg Pts > 2.0)', 'Rivalries', SCOPE_CROSS, getBestDuos(regSeasonGames));
        processStat('Worst Duo (Combined Avg Pts < 2.0)', 'Rivalries', SCOPE_CROSS, getBestDuos(regSeasonGames));
        processStat('Worst Enemies (Lowest Avg Score vs Opponent)', 'Rivalries', SCOPE_CROSS, getWorstEnemies(regSeasonGames));

        const SCOPE_PLAYER_MATCHUPS = 'Player Matchups';
        const MIN_VS_OPPONENT = 3;
        const MIN_WITH_PARTNER = 3;
        const oppByPlayer = buildOpponentStatsByPlayer(regSeasonGames);
        const duoByPlayer = buildDuoStatsByPlayer(regSeasonGames);
        const matchupPlayers = [...new Set(regSeasonGames.map(g => g.player))].sort((a, b) =>
            a.localeCompare(b)
        );

        for (const pname of matchupPlayers) {
            const gamesVsList = getOpponentGameCountsList(pname, oppByPlayer);
            const droughtList = getMatchupDroughtsForPlayer(pname, leagueGames, activePlayersSet);
            const bestVs = getRankedOpponentsForPlayer(pname, oppByPlayer, MIN_VS_OPPONENT, true);
            const worstVs = getRankedOpponentsForPlayer(pname, oppByPlayer, MIN_VS_OPPONENT, false);
            const bestWith = getRankedPartnersForPlayer(pname, duoByPlayer, MIN_WITH_PARTNER, true);
            const worstWith = getRankedPartnersForPlayer(pname, duoByPlayer, MIN_WITH_PARTNER, false);
            if (
                gamesVsList.length === 0 &&
                droughtList.length === 0 &&
                bestVs.length + worstVs.length + bestWith.length + worstWith.length === 0
            ) {
                continue;
            }

            processStat('Games vs Each Opponent', pname, SCOPE_PLAYER_MATCHUPS, gamesVsList);

            processStat(
                'Longest Matchup Droughts (> 6 Weeks Since Last Play)',
                pname,
                SCOPE_PLAYER_MATCHUPS,
                droughtList
            );
            processStat(`Best Against (Avg Pts, Min ${MIN_VS_OPPONENT} Games)`, pname, SCOPE_PLAYER_MATCHUPS, bestVs);
            processStat(
                `Worst Against (Avg Pts, Min ${MIN_VS_OPPONENT} Games)`,
                pname,
                SCOPE_PLAYER_MATCHUPS,
                worstVs
            );
            processStat(
                `Best With (Combined Table Avg, Min ${MIN_WITH_PARTNER} Games)`,
                pname,
                SCOPE_PLAYER_MATCHUPS,
                bestWith
            );
            processStat(
                `Worst With (Combined Table Avg, Min ${MIN_WITH_PARTNER} Games)`,
                pname,
                SCOPE_PLAYER_MATCHUPS,
                worstWith
            );
        }

        const SCOPE_METRICS = 'Historic Performances';
        const seasonMetrics = calculateSeasonMetrics(leagueGames);

        processStat('Lowest Points to Qualify for Playoffs', 'Cutoffs', SCOPE_METRICS, seasonMetrics.lowestQualifiers);

        const sosStats = calculateStrengthOfSchedule(regSeasonGames);
        processStat('Hardest Strength of Schedule (All-Time Avg Opponent Pts)', 'Difficulty', SCOPE_METRICS, sosStats.hardest);
        processStat('Easiest Strength of Schedule (All-Time Avg Opponent Pts)', 'Difficulty', SCOPE_METRICS, sosStats.easiest);
        processStat('Hardest Path to Playoffs (Single Season SoS)', 'Difficulty', SCOPE_METRICS, getHardestPathToPlayoffs(regSeasonGames, leagueGames));

        processStat('Worst Start (2 Games) to Make Playoffs', 'Comebacks', SCOPE_METRICS, seasonMetrics.worstStarts2);
        processStat('Worst Start (3 Games) to Make Playoffs', 'Comebacks', SCOPE_METRICS, seasonMetrics.worstStarts3);
        processStat('Worst Start (4 Games) to Make Playoffs', 'Comebacks', SCOPE_METRICS, seasonMetrics.worstStarts4);

        processStat('Best Start (2 Games) to Miss Playoffs', 'Collapses', SCOPE_METRICS, seasonMetrics.bestMisses2);
        processStat('Best Start (3 Games) to Miss Playoffs', 'Collapses', SCOPE_METRICS, seasonMetrics.bestMisses3);
        processStat('Best Start (4 Games) to Miss Playoffs', 'Collapses', SCOPE_METRICS, seasonMetrics.bestMisses4);

        const SCOPE_TRENDS = 'Trends (Regular Season)';

        const timeframes = [
            { label: 'Last 5 Games', type: 'games', value: 5 },
            { label: 'Last 10 Games', type: 'games', value: 10 },
            { label: 'Last 2 Seasons', type: 'season', value: 2 },
            { label: 'Last 3 Seasons', type: 'season', value: 3 }
        ];

        timeframes.forEach(tf => {
            const tfData = filterDataset(regSeasonGames, tf.type, tf.value, maxSeason);

            const subCat = tf.label;

            const minG = tf.type === 'games' && tf.value <= 5 ? 2 : 3;

            processStat('Average Points per Game', subCat, SCOPE_TRENDS, getAveragePoints(tfData, minG));
            processStat('Win %', subCat, SCOPE_TRENDS, getPlacementRates(tfData, g => g.place === 1, minG));

            processStat('% of 2nd Place Finishes', subCat, SCOPE_TRENDS, getPlacementRates(tfData, g => g.place === 2, minG));
            processStat('% of 3rd Place Finishes', subCat, SCOPE_TRENDS, getPlacementRates(tfData, g => g.place === 3, minG));
            processStat('% of 4th Place Finishes', subCat, SCOPE_TRENDS, getPlacementRates(tfData, g => g.place === 4, minG));
            processStat('Top Half Finish % (1st/2nd)', subCat, SCOPE_TRENDS, getPlacementRates(tfData, g => g.place <= 2, minG));
            processStat('Bottom Half Finish % (3rd/4th)', subCat, SCOPE_TRENDS, getPlacementRates(tfData, g => g.place > 2, minG));
        });
    } catch (err) {
        console.error('computeLeagueAnalytics:', err);
        throw err;
    }

    return jsonOutput;
}
