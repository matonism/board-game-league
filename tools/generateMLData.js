const fs = require('fs');
const path = require('path');

// --- Configuration ---
const OUTPUT_DIR = path.join(__dirname, 'machineLearning');
const INPUT_DIR = path.join(__dirname, 'output'); 
if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const SCHEDULES_FILE = 'Schedules.txt'; 
const SUMMARIES_FILE = 'GameSummaries.txt';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'bgl_ml_features.json');

// --- CONSTANTS ---
const ROOKIE_THRESHOLD = 5; 

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
    const playerWinWeights = {}; 
    
    const allPastGames = [];  
    const lastSeasonAverage = {}; 

    const years = Object.keys(schedules).sort();

    years.forEach(year => {
        const seasonWeeks = schedules[year];
        const seasonPoints = {};
        const seasonOpponentSum = {}; 
        const seasonGamesPlayed = {};

        // 1. CALCULATE SEASON CONTEXT (DYNAMICALLY)
        
        // A. Count Total Regular Season Players
        // (Exclude 'Playoff' AND 'Championship' from the regular season pool count, 
        //  though typically everyone in playoffs was in reg season anyway. 
        //  Safest to just add everyone from non-postseason weeks.)
        const uniquePlayersInSeason = new Set();
        seasonWeeks.forEach(week => {
            const weekLower = week.week.toLowerCase();
            if (!weekLower.includes("playoff") && !weekLower.includes("championship")) {
                week.results.forEach(pod => {
                    if (pod.players) {
                        pod.players.forEach(p => uniquePlayersInSeason.add(p.player));
                    }
                });
            }
        });
        const totalPlayers = uniquePlayersInSeason.size || 12;

        // B. EXTRAPOLATE PLAYOFF SPOTS (AGGREGATE ALL POST-SEASON WEEKS)
        // We look for 'Playoff' OR 'Championship'
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
        
        // Fallback: If no playoffs found (e.g. current season 2026), default to 8
        if (playoffSpots === 0) {
            playoffSpots = 8; 
        }

        // C. Calculate Target Score (The "Cutline")
        const percentileNeeded = 1 - (playoffSpots / totalPlayers);
        
        // Dynamic Pace Formula
        // 50th percentile = 1.5. 
        // If you need top 33%, you need significantly more.
        let seasonTargetPPG = 1.5 + ((percentileNeeded - 0.5) * 2.0);
        seasonTargetPPG = Math.max(1.0, Math.min(2.5, seasonTargetPPG));

        console.log(`\nSeason ${year}: ${totalPlayers} Players. Found ${playoffSpots} Post-Season Qualifiers.`);
        console.log(`  -> Difficulty: Top ${(1-percentileNeeded).toFixed(2)*100}% qualify.`);
        console.log(`  -> Target PPG: ${seasonTargetPPG.toFixed(2)} pts/game`);

        // 2. Process Weeks
        seasonWeeks.forEach(weekData => {
            const weekName = weekData.week;
            const weekLower = weekName.toLowerCase();
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

            weekData.results.forEach(pod => {
                if (!pod.players || pod.players.length === 0) return;

                // Detect Future Game
                let isFutureGame = false;
                const podResults = {};
                pod.players.forEach(p => {
                    if (p.placement === undefined || p.placement === null || p.placement === "" || isNaN(parseInt(p.placement))) {
                        isFutureGame = true;
                    } else {
                        podResults[p.player] = parseInt(p.placement);
                    }
                });

                const podPlayers = pod.players.map(p => p.player);
                const location = pod.location || "";

                podPlayers.forEach(player => {
                    const opponents = podPlayers.filter(p => p !== player);
                    const history = playerHistory[player] || { placements: [], playoffApps: 0 };
                    const placements = history.placements;
                    
                    // Stats
                    const careerAvg = calculateAverage(placements);
                    const stdDev = calculateStdDev(placements, careerAvg);
                    const tenure = placements.length;
                    const isRookie = tenure < ROOKIE_THRESHOLD ? 1 : 0;
                    
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

                    // Tenure Gap
                    const currentOpponentAvgs = [];
                    const currentOpponentTenures = [];
                    opponents.forEach(o => {
                        const oppHist = playerHistory[o]?.placements || [];
                        currentOpponentAvgs.push(calculateAverage(oppHist));
                        currentOpponentTenures.push(oppHist.length);
                    });
                    const currentOppAvg = calculateAverage(currentOpponentAvgs);
                    const avgOpponentTenure = calculateAverage(currentOpponentTenures);
                    const tenureGap = tenure - avgOpponentTenure;

                    // Season Context
                    const sosSum = seasonOpponentSum[player] || 0;
                    const currentSeasonGames = seasonGamesPlayed[player] || 0;
                    const seasonSOS = currentSeasonGames > 0 ? (sosSum / currentSeasonGames) : 2.5;
                    const mySeasonPoints = seasonPoints[player] || 0;
                    
                    // DYNAMIC PACE
                    const pointsAbovePace = mySeasonPoints - (currentSeasonGames * seasonTargetPPG);

                    const h2hWinRate = getH2HWinRate(player, opponents, allPastGames);

                    const row = {
                        Year: year,
                        Week: weekName,
                        WeekNum: weekNum,
                        Player: player,
                        Game: gameName,
                        Difficulty: gameWeight,
                        IsHome: location.includes(player) ? 1 : 0,
                        CareerAvg: parseFloat(careerAvg.toFixed(3)),
                        Consistency_StdDev: parseFloat(stdDev.toFixed(3)),
                        Tenure: tenure,
                        TenureGap: parseFloat(tenureGap.toFixed(1)),
                        IsRookie: isRookie,
                        ComplexityDelta: parseFloat(complexityDelta.toFixed(3)),
                        MechanicSkill: parseFloat(mechanicSkill.toFixed(3)),
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
                        SeasonPoints: mySeasonPoints,
                        PointsAbovePace: parseFloat(pointsAbovePace.toFixed(2)),
                        SeasonSOS: parseFloat(seasonSOS.toFixed(3)),
                        CurrentOppAvg: parseFloat(currentOppAvg.toFixed(3)),
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
                            // Avoid double counting if someone plays in both? 
                            // Usually 'Apperances' means seasons qualified.
                            // But simply incrementing is fine as a 'Post-season Experience' metric.
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
                        
                        // Season Points
                        const pts = {1:3, 2:2, 3:1, 4:0}[place] || 0;
                        seasonPoints[player] = (seasonPoints[player] || 0) + pts;
                        seasonGamesPlayed[player] = (seasonGamesPlayed[player] || 0) + 1;
                        
                        // SOS
                        const opps = podPlayers.filter(p => p !== player);
                        const oppAvgThisGame = calculateAverage(opps.map(o => calculateAverage(playerHistory[o]?.placements || [])));
                        seasonOpponentSum[player] = (seasonOpponentSum[player] || 0) + oppAvgThisGame;
                    });
                    allPastGames.push({ year: year, week: weekName, players: podResults });
                }
            });
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