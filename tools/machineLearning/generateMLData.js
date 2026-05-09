const fs = require('fs');
const path = require('path');

// --- Configuration ---
// This file was moved under `tools/machineLearning/`.
// Inputs stay in `tools/output/`, output stays in `tools/machineLearning/`.
const TOOLS_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(__dirname);
const INPUT_DIR = path.join(TOOLS_DIR, 'output');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const SCHEDULES_FILE = 'Schedules.txt';
const SUMMARIES_FILE = 'GameSummaries.txt';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'bgl_ml_features.json');

// --- CONSTANTS ---
const ROOKIE_THRESHOLD = 5;
const TENURE_CAP = 6; // After ~1 season, experience stops scaling
const ELO_START = 1500;
const ELO_K = 24;

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function averageOrDefault(arr, def) {
    if (!arr || arr.length === 0) return def;
    return calculateAverage(arr);
}

function stdDevOrDefault(arr, mean, def) {
    if (!arr || arr.length < 2) return def;
    return calculateStdDev(arr, mean);
}

function expectedScore(ra, rb) {
    return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateEloForPod(podPlayers, podResults, playerElo, playerEloGames) {
    // Pairwise Elo updates based on placement ordering.
    // For each unordered pair (a,b), a "wins" if placement is lower.
    for (let i = 0; i < podPlayers.length; i++) {
        for (let j = i + 1; j < podPlayers.length; j++) {
            const a = podPlayers[i];
            const b = podPlayers[j];
            const pa = podResults[a];
            const pb = podResults[b];
            if (pa === undefined || pb === undefined) continue;

            const ra = playerElo[a] ?? ELO_START;
            const rb = playerElo[b] ?? ELO_START;

            const ea = expectedScore(ra, rb);
            const eb = 1 - ea;

            const sa = pa < pb ? 1 : 0;
            const sb = 1 - sa;

            const newRa = ra + ELO_K * (sa - ea);
            const newRb = rb + ELO_K * (sb - eb);

            playerElo[a] = newRa;
            playerElo[b] = newRb;
            playerEloGames[a] = (playerEloGames[a] ?? 0) + 1;
            playerEloGames[b] = (playerEloGames[b] ?? 0) + 1;
        }
    }
}

// --- Helper Functions ---
const calculateAverage = (arr) => {
    if (!arr || arr.length === 0) return 2.5;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
};

const calculateStdDev = (arr, mean) => {
    if (!arr || arr.length < 2) return 1.1;
    const squareDiffs = arr.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = calculateAverage(squareDiffs);
    return Math.sqrt(avgSquareDiff);
};

/**
 * Normalize player names from schedule text.
 * Some schedule entries use shortened names that don't match historical stats.
 */
function normalizePlayerName({ year, weekName, gameName, playerName }) {
    // 2026 Championship entry uses "Jack" but historical data uses "Jack M" / "Jack C".
    if (
        String(playerName).trim() === "Jack" &&
        String(year) === "2026" &&
        String(weekName).toLowerCase().includes("championship") &&
        String(gameName).trim() === "Wyrmspan"
    ) {
        return "Jack M";
    }
    return playerName;
}

/** Matches generateReports7 / DataFormatter (hyphenated "Tie-Break", etc.) */
function isTieBreakWeekName(weekName) {
    const n = String(weekName)
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return n.includes('tie break') || n.includes('tiebreaker');
}

const getH2HWinRate = (player, currentOpponents, allPastGames) => {
    let wins = 0;
    let games = 0;
    const myGames = allPastGames.filter(g => g.players[player] !== undefined);

    myGames.forEach(game => {
        const myPlace = game.players[player];
        currentOpponents.forEach(opp => {
            if (game.players[opp] !== undefined) {
                const oppPlace = game.players[opp];
                games++;
                if (myPlace < oppPlace) wins++;
            }
        });
    });
    return games > 0 ? (wins / games) : 0.5;
};

// Main Execution
try {
    const schedulesPath = fs.existsSync(path.join(INPUT_DIR, SCHEDULES_FILE)) ? path.join(INPUT_DIR, SCHEDULES_FILE) : SCHEDULES_FILE;
    const summariesPath = fs.existsSync(path.join(INPUT_DIR, SUMMARIES_FILE)) ? path.join(INPUT_DIR, SUMMARIES_FILE) : SUMMARIES_FILE;

    const schedules = JSON.parse(fs.readFileSync(schedulesPath, 'utf8'));
    const gameSummaries = JSON.parse(fs.readFileSync(summariesPath, 'utf8'));
    const rows = [];

    // --- Global State ---
    const playerHistory = {};
    const playerGameHistory = {};
    const playerMechanicHistory = {};
    const playerCategoryHistory = {};
    const playerWinWeights = {};
    const playerElo = {};
    const playerEloGames = {};

    const allPastGames = [];
    const lastSeasonAverage = {};
    /** Game titles that have finished at least one pod in an earlier processed week (cross-season). */
    const leagueGamesSeenBefore = new Set();

    const years = Object.keys(schedules).sort();

    years.forEach(year => {
        const seasonWeeks = schedules[year];
        const seasonPoints = {};
        const seasonOpponentSum = {};
        const seasonGamesPlayed = {};

        // 1. CALCULATE SEASON CONTEXT (DYNAMICALLY)

        // A. Count Total Regular Season Players
        const uniquePlayersInSeason = new Set();
        seasonWeeks.forEach(week => {
            const weekLower = week.week.toLowerCase();
            if (
                !isTieBreakWeekName(week.week) &&
                !weekLower.includes("playoff") &&
                !weekLower.includes("championship")
            ) {
                week.results.forEach(pod => {
                    if (pod.players) {
                        pod.players.forEach(p => uniquePlayersInSeason.add(p.player));
                    }
                });
            }
        });
        const totalPlayers = uniquePlayersInSeason.size || 12;

        // B. EXTRAPOLATE PLAYOFF SPOTS (AGGREGATE ALL POST-SEASON WEEKS)
        const uniquePlayoffPlayers = new Set();
        seasonWeeks.forEach(week => {
            const weekLower = week.week.toLowerCase();
            if (weekLower.includes("playoff") || weekLower.includes("championship")) {
                week.results.forEach(pod => {
                    if (pod.players) {
                        pod.players.forEach(p => uniquePlayoffPlayers.add(p.player));
                    }
                });
            }
        });

        let playoffSpots = uniquePlayoffPlayers.size;
        if (playoffSpots === 0) {
            playoffSpots = 8;
        }

        // C. Calculate Target Score (The "Cutline")
        const percentileNeeded = 1 - (playoffSpots / totalPlayers);
        let seasonTargetPPG = 1.5 + ((percentileNeeded - 0.5) * 2.0);
        seasonTargetPPG = Math.max(1.0, Math.min(2.5, seasonTargetPPG));

        console.log(`\nSeason ${year}: ${totalPlayers} Players. Found ${playoffSpots} Post-Season Qualifiers.`);
        console.log(`  -> Difficulty: Top ${(1 - percentileNeeded).toFixed(2) * 100}% qualify.`);
        console.log(`  -> Target PPG: ${seasonTargetPPG.toFixed(2)} pts/game`);

        // 2. Process Weeks
        seasonWeeks.forEach(weekData => {
            const weekName = weekData.week;
            const weekLower = String(weekName).toLowerCase();
            if (isTieBreakWeekName(weekName)) {
                return;
            }
            const gameName = weekData.game;

            let weekNum = 0;
            const weekMatch = weekName.match(/Week\s+(\d+)/i);
            if (weekMatch) {
                weekNum = parseInt(weekMatch[1]);
            } else if (weekLower.includes("playoff") || weekLower.includes("championship")) {
                weekNum = 8; // Treat all post-season as "Week 8+"
            }

            const gameInfo = gameSummaries[gameName] || { difficulty: "2.0", mechanics: [] };
            const gameWeight = parseFloat(gameInfo.difficulty || 2.0);
            const mechanicsList = Array.isArray(gameInfo.mechanics) ? gameInfo.mechanics : [];
            const categoriesList = Array.isArray(gameInfo.categories) ? gameInfo.categories : [];

            const familiarGame = leagueGamesSeenBefore.has(gameName) ? 1 : 0;
            let anyCompletedPodThisWeek = false;

            weekData.results.forEach((pod, podIndex) => {
                if (!pod.players || pod.players.length === 0) return;

                // Detect Future Game
                let isFutureGame = false;
                const podResults = {};
                pod.players.forEach(p => {
                    p.player = normalizePlayerName({
                        year,
                        weekName,
                        gameName,
                        playerName: p.player
                    });
                    if (p.placement === undefined || p.placement === null || p.placement === "" || isNaN(parseInt(p.placement))) {
                        isFutureGame = true;
                    } else {
                        podResults[p.player] = parseInt(p.placement);
                    }
                });
                if (!isFutureGame) {
                    anyCompletedPodThisWeek = true;
                }

                const podPlayers = pod.players.map(p => p.player);
                const location = pod.location || "";
                const podId = `${year}__${weekName}__${gameName}__pod${podIndex + 1}`;

                podPlayers.forEach(player => {
                    const opponents = podPlayers.filter(p => p !== player);
                    const history = playerHistory[player] || { placements: [], playoffApps: 0 };
                    const placements = history.placements;

                    // Stats
                    const careerAvg = calculateAverage(placements);
                    const stdDev = calculateStdDev(placements, careerAvg);
                    const tenureRaw = placements.length;
                    const tenure = Math.min(tenureRaw, TENURE_CAP);
                    const isRookie = tenureRaw < ROOKIE_THRESHOLD ? 1 : 0;

                    let rookieOpponents = 0;
                    opponents.forEach(opp => {
                        if ((playerHistory[opp]?.placements?.length || 0) < ROOKIE_THRESHOLD) rookieOpponents++;
                    });

                    const winWeights = playerWinWeights[player] || [];
                    const avgWinWeight = winWeights.length > 0 ? calculateAverage(winWeights) : 2.0;
                    const complexityDelta = gameWeight - avgWinWeight;

                    const prevGame = placements.length > 0 ? placements[placements.length - 1] : 2.5;
                    const prev2Avg = placements.length >= 2
                        ? (placements[placements.length - 1] + placements[placements.length - 2]) / 2
                        : 2.5;

                    let winStreak = 0;
                    for (let i = placements.length - 1; i >= 0; i--) {
                        if (placements[i] === 1) winStreak++; else break;
                    }
                    let noLastStreak = 0;
                    for (let i = placements.length - 1; i >= 0; i--) {
                        if (placements[i] !== 4) noLastStreak++; else break;
                    }

                    let secondStreak = 0;
                    for (let i = placements.length - 1; i >= 0; i--) {
                        if (placements[i] === 2) secondStreak++;
                        else break;
                    }
                    let thirdStreak = 0;
                    for (let i = placements.length - 1; i >= 0; i--) {
                        if (placements[i] === 3) thirdStreak++;
                        else break;
                    }
                    const myGameHist = playerGameHistory[player]?.[gameName] || [];
                    const lastTitleFinish = myGameHist.length > 0 ? myGameHist[myGameHist.length - 1] : 2.5;

                    let mechSum = 0;
                    let mechCount = 0;
                    if (mechanicsList.length > 0) {
                        mechanicsList.forEach(m => {
                            const mHist = playerMechanicHistory[player]?.[m] || [];
                            if (mHist.length > 0) {
                                mechSum += calculateAverage(mHist);
                                mechCount++;
                            }
                        });
                    }
                    const mechanicSkill = mechCount > 0 ? (mechSum / mechCount) : careerAvg;

                    // Category skill (game-to-game generalization via BGG categories)
                    let catSum = 0;
                    let catCount = 0;
                    if (categoriesList.length > 0) {
                        categoriesList.forEach(c => {
                            const cHist = playerCategoryHistory[player]?.[c] || [];
                            if (cHist.length > 0) {
                                catSum += calculateAverage(cHist);
                                catCount++;
                            }
                        });
                    }
                    const categorySkill = catCount > 0 ? (catSum / catCount) : careerAvg;

                    // Tenure Gap
                    const currentOpponentAvgs = [];
                    const currentOpponentTenures = [];
                    const currentOpponentElos = [];
                    opponents.forEach(o => {
                        const oppHist = playerHistory[o]?.placements || [];
                        currentOpponentAvgs.push(calculateAverage(oppHist));
                        currentOpponentTenures.push(Math.min(oppHist.length, TENURE_CAP));
                        currentOpponentElos.push(playerElo[o] ?? ELO_START);
                    });
                    const currentOppAvg = calculateAverage(currentOpponentAvgs);
                    const avgOpponentTenure = calculateAverage(currentOpponentTenures);
                    const tenureGap = tenure - avgOpponentTenure;
                    const oppAvgElo = averageOrDefault(currentOpponentElos, ELO_START);
                    const oppStdElo = stdDevOrDefault(currentOpponentElos, oppAvgElo, 0);
                    const oppMaxElo = currentOpponentElos.length ? Math.max(...currentOpponentElos) : ELO_START;

                    const oppStdCareerAvg = stdDevOrDefault(currentOpponentAvgs, currentOppAvg, 0);
                    const oppMinCareerAvg = currentOpponentAvgs.length ? Math.min(...currentOpponentAvgs) : 2.5;
                    const oppMaxCareerAvg = currentOpponentAvgs.length ? Math.max(...currentOpponentAvgs) : 2.5;

                    // Season Context
                    const sosSum = seasonOpponentSum[player] || 0;
                    const currentSeasonGames = seasonGamesPlayed[player] || 0;
                    const seasonSOS = currentSeasonGames > 0 ? (sosSum / currentSeasonGames) : 2.5;
                    const mySeasonPoints = seasonPoints[player] || 0;

                    const seasonPPG = currentSeasonGames > 0 ? (mySeasonPoints / currentSeasonGames) : 0;
                    // SOS-adjusted PPG heuristic:
                    // SeasonSOS is average opponent careerAvg (lower = tougher).
                    // Harder schedule => (2.5 - SeasonSOS) positive. We give a modest boost for harder schedules.
                    const scheduleHardness = 2.5 - seasonSOS;
                    const seasonAdjPPG = seasonPPG + (scheduleHardness * 0.4);

                    // DYNAMIC PACE
                    const pointsAbovePace = mySeasonPoints - (currentSeasonGames * seasonTargetPPG);

                    const h2hWinRate = getH2HWinRate(player, opponents, allPastGames);

                    const myElo = playerElo[player] ?? ELO_START;
                    const myEloGames = playerEloGames[player] ?? 0;

                    const row = {
                        Year: year,
                        Week: weekName,
                        WeekNum: weekNum,
                        PodId: podId,
                        Player: player,
                        Game: gameName,
                        Difficulty: gameWeight,
                        FamiliarGame: familiarGame,
                        IsHome: location.includes(player) ? 1 : 0,
                        CareerAvg: parseFloat(careerAvg.toFixed(3)),
                        Consistency_StdDev: parseFloat(stdDev.toFixed(3)),
                        Tenure: tenure,
                        TenureGap: parseFloat(tenureGap.toFixed(1)),
                        Elo: parseFloat(myElo.toFixed(1)),
                        EloGames: myEloGames,
                        OppAvgElo: parseFloat(oppAvgElo.toFixed(1)),
                        OppStdElo: parseFloat(oppStdElo.toFixed(1)),
                        OppMaxElo: parseFloat(oppMaxElo.toFixed(1)),
                        IsRookie: isRookie,
                        ComplexityDelta: parseFloat(complexityDelta.toFixed(3)),
                        MechanicSkill: parseFloat(mechanicSkill.toFixed(3)),
                        MechanicSkillSamples: mechCount,
                        CategorySkill: parseFloat(categorySkill.toFixed(3)),
                        CategorySkillSamples: catCount,
                        LastTitlePlacement: lastTitleFinish,
                        PrevGame: prevGame,
                        Prev2Avg: prev2Avg,
                        WinStreak: winStreak,
                        NoLastStreak: noLastStreak,
                        SecondStreak: secondStreak,
                        ThirdStreak: thirdStreak,
                        PlayoffAppearances: history.playoffApps,
                        LastSeasonAvg: lastSeasonAverage[player] || 2.5,
                        RookieOpponents: rookieOpponents,
                        H2H_WinRate: parseFloat(h2hWinRate.toFixed(3)),
                        SeasonPPG: parseFloat(seasonPPG.toFixed(3)),
                        SeasonAdjPPG: parseFloat(seasonAdjPPG.toFixed(3)),
                        PointsAbovePace: parseFloat(pointsAbovePace.toFixed(2)),
                        SeasonSOS: parseFloat(seasonSOS.toFixed(3)),
                        CurrentOppAvg: parseFloat(currentOppAvg.toFixed(3)),
                        CurrentOppStd: parseFloat(oppStdCareerAvg.toFixed(3)),
                        CurrentOppMin: parseFloat(oppMinCareerAvg.toFixed(3)),
                        CurrentOppMax: parseFloat(oppMaxCareerAvg.toFixed(3)),
                        Placement: isFutureGame ? null : podResults[player]
                    };
                    rows.push(row);
                });

                if (!isFutureGame) {
                    podPlayers.forEach(player => {
                        const place = podResults[player];

                        // Update Histories
                        if (!playerHistory[player]) playerHistory[player] = { placements: [], playoffApps: 0 };
                        playerHistory[player].placements.push(place);

                        // Track Playoff Appearances (Playoff OR Championship)
                        const wName = weekName.toLowerCase();
                        if (wName.includes("playoff") || wName.includes("championship")) {
                            playerHistory[player].playoffApps++;
                        }

                        if (place === 1) {
                            if (!playerWinWeights[player]) playerWinWeights[player] = [];
                            playerWinWeights[player].push(gameWeight);
                        }
                        if (!playerGameHistory[player]) playerGameHistory[player] = {};
                        if (!playerGameHistory[player][gameName]) playerGameHistory[player][gameName] = [];
                        playerGameHistory[player][gameName].push(place);
                        if (!playerMechanicHistory[player]) playerMechanicHistory[player] = {};
                        mechanicsList.forEach(m => {
                            if (!playerMechanicHistory[player][m]) playerMechanicHistory[player][m] = [];
                            playerMechanicHistory[player][m].push(place);
                        });

                        if (!playerCategoryHistory[player]) playerCategoryHistory[player] = {};
                        categoriesList.forEach(c => {
                            if (!playerCategoryHistory[player][c]) playerCategoryHistory[player][c] = [];
                            playerCategoryHistory[player][c].push(place);
                        });

                        // Season Points
                        const pts = { 1: 3, 2: 2, 3: 1, 4: 0 }[place] || 0;
                        seasonPoints[player] = (seasonPoints[player] || 0) + pts;
                        seasonGamesPlayed[player] = (seasonGamesPlayed[player] || 0) + 1;

                        // SOS
                        const opps = podPlayers.filter(p => p !== player);
                        const oppAvgThisGame = calculateAverage(opps.map(o => calculateAverage(playerHistory[o]?.placements || [])));
                        seasonOpponentSum[player] = (seasonOpponentSum[player] || 0) + oppAvgThisGame;
                    });
                    allPastGames.push({ year: year, week: weekName, players: podResults });

                    // Update Elo ratings AFTER the game completes (so features are pre-match).
                    updateEloForPod(podPlayers, podResults, playerElo, playerEloGames);
                }
            });

            if (anyCompletedPodThisWeek) {
                leagueGamesSeenBefore.add(gameName);
            }
        });

        // End Season Averages
        Object.keys(seasonPoints).forEach(player => {
            const gamesPlayedThisYear = seasonGamesPlayed[player];
            if (playerHistory[player] && gamesPlayedThisYear > 0) {
                const allPlacements = playerHistory[player].placements;
                const thisYearPlacements = allPlacements.slice(-gamesPlayedThisYear);
                lastSeasonAverage[player] = parseFloat(calculateAverage(thisYearPlacements).toFixed(3));
            }
        });
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rows, null, 2));
    console.log(`Success! Generated ${rows.length} rows with corrected Post-Season logic.`);
} catch (err) {
    console.error("Error processing files:", err);
}

