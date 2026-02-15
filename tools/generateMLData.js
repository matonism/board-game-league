const fs = require('fs');
const path = require('path');

// --- Configuration ---
const OUTPUT_DIR = path.join(__dirname, 'machineLearning');
const INPUT_DIR = path.join(__dirname, 'output'); 
if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR);
}

const SCHEDULES_FILE = path.join(INPUT_DIR,'Schedules.txt'); // Ensure this matches your filename
const SUMMARIES_FILE = path.join(INPUT_DIR,'GameSummaries.txt');
const OUTPUT_FILE = path.join(OUTPUT_DIR,'bgl_ml_features.json');

// --- Helper Functions ---
const calculateAverage = (arr) => {
    if (!arr || arr.length === 0) return 2.5; 
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
};

const calculateStdDev = (arr, mean) => {
    if (!arr || arr.length < 2) return 1.1; // Default "normal" volatility
    const squareDiffs = arr.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = calculateAverage(squareDiffs);
    return Math.sqrt(avgSquareDiff);
};

const getH2HWinRate = (player, currentOpponents, allPastGames) => {
    let wins = 0;
    let games = 0;
    // Optimization: Filter games once
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
    const schedules = JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
    const gameSummaries = JSON.parse(fs.readFileSync(SUMMARIES_FILE, 'utf8'));
    const rows = [];
    
    // --- Global State ---
    const playerHistory = {}; // { Name: { placements: [], playoffApps: 0 } }
    const playerGameHistory = {}; // { Name: { "Catan": [1, 4] } }
    const playerMechanicHistory = {}; // { Name: { "Dice Rolling": [2, 1, 3] } }
    
    const allPastGames = [];  
    const lastSeasonAverage = {}; 

    const years = Object.keys(schedules).sort();

    years.forEach(year => {
        const seasonWeeks = schedules[year];
        const seasonPoints = {};
        const seasonOpponentSum = {}; 
        const seasonGamesPlayed = {};

        seasonWeeks.forEach(weekData => {
            const weekName = weekData.week;
            const gameName = weekData.game;
            
            // Get Game Info
            const gameInfo = gameSummaries[gameName] || { difficulty: "2.0", mechanics: [] };
            const mechanicsList = Array.isArray(gameInfo.mechanics) ? gameInfo.mechanics : [];
            const mechanicsStr = mechanicsList.join('|');

            weekData.results.forEach(pod => {
                if (!pod.players || pod.players.length === 0) return;

                // --- DETECT FUTURE GAME ---
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

                // --- GENERATE FEATURES ---
                podPlayers.forEach(player => {
                    const opponents = podPlayers.filter(p => p !== player);
                    const history = playerHistory[player] || { placements: [], playoffApps: 0 };
                    const placements = history.placements;
                    
                    // 1. Basic Stats
                    const careerAvg = calculateAverage(placements);
                    const stdDev = calculateStdDev(placements, careerAvg);
                    const tenure = placements.length;
                    
                    // 2. Recent Form
                    const prevGame = placements.length > 0 ? placements[placements.length - 1] : 2.5;
                    const prev2Avg = placements.length >= 2 
                        ? (placements[placements.length - 1] + placements[placements.length - 2]) / 2 
                        : 2.5;

                    // 3. Streaks
                    let winStreak = 0;
                    for (let i = placements.length - 1; i >= 0; i--) {
                        if (placements[i] === 1) winStreak++;
                        else break;
                    }
                    let noLastStreak = 0;
                    for (let i = placements.length - 1; i >= 0; i--) {
                        if (placements[i] !== 4) noLastStreak++;
                        else break;
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

                    // 4. Specific Game History (How did they do in THIS game before?)
                    const myGameHist = playerGameHistory[player]?.[gameName] || [];
                    const lastTitleFinish = myGameHist.length > 0 ? myGameHist[myGameHist.length - 1] : 2.5;

                    // 5. Mechanic Skill (Average finish in games with THESE mechanics)
                    // If the game has "Dice" and "Cards", we avg their historical performance in ALL "Dice" and "Cards" games
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
                    // If they have never played these mechanics, default to their career avg
                    const mechanicSkill = mechCount > 0 ? (mechSum / mechCount) : careerAvg;


                    // 6. Opponent Metrics
                    const currentOpponentAvgs = opponents.map(o => {
                        const oppHist = playerHistory[o]?.placements || [];
                        return calculateAverage(oppHist);
                    });
                    const currentOppAvg = calculateAverage(currentOpponentAvgs);

                    const sosSum = seasonOpponentSum[player] || 0;
                    const sosGames = seasonGamesPlayed[player] || 0;
                    const seasonSOS = sosGames > 0 ? (sosSum / sosGames) : 2.5;

                    const h2hWinRate = getH2HWinRate(player, opponents, allPastGames);

                    // Build Row
                    const row = {
                        Year: year,
                        Week: weekName,
                        Player: player,
                        Game: gameName,
                        Difficulty: parseFloat(gameInfo.difficulty || 2.0),
                        IsHome: location.includes(player) ? 1 : 0,
                        
                        // Skill Features
                        CareerAvg: parseFloat(careerAvg.toFixed(3)),
                        Consistency_StdDev: parseFloat(stdDev.toFixed(3)), // NEW
                        MechanicSkill: parseFloat(mechanicSkill.toFixed(3)), // NEW
                        LastTitlePlacement: lastTitleFinish, // NEW
                        
                        Tenure: tenure,
                        PrevGame: prevGame,
                        Prev2Avg: prev2Avg,
                        WinStreak: winStreak,
                        NoLastStreak: noLastStreak,
                        PlayoffAppearances: history.playoffApps,
                        LastSeasonAvg: lastSeasonAverage[player] || 2.5,
                        
                        // Context Features
                        H2H_WinRate: parseFloat(h2hWinRate.toFixed(3)),
                        SeasonPoints: seasonPoints[player] || 0,
                        SeasonSOS: parseFloat(seasonSOS.toFixed(3)),
                        CurrentOppAvg: parseFloat(currentOppAvg.toFixed(3)),
                        
                        // TARGET
                        Placement: isFutureGame ? null : podResults[player]
                    };

                    rows.push(row);
                });

                // --- UPDATE HISTORY (ONLY IF GAME IS FINISHED) ---
                if (!isFutureGame) {
                    podPlayers.forEach(player => {
                        const place = podResults[player];
                        
                        // Global History
                        if (!playerHistory[player]) playerHistory[player] = { placements: [], playoffApps: 0 };
                        playerHistory[player].placements.push(place);
                        if (weekName.toLowerCase().includes("playoff")) playerHistory[player].playoffApps++;

                        // Game Specific History
                        if (!playerGameHistory[player]) playerGameHistory[player] = {};
                        if (!playerGameHistory[player][gameName]) playerGameHistory[player][gameName] = [];
                        playerGameHistory[player][gameName].push(place);

                        // Mechanic History
                        if (!playerMechanicHistory[player]) playerMechanicHistory[player] = {};
                        mechanicsList.forEach(m => {
                            if (!playerMechanicHistory[player][m]) playerMechanicHistory[player][m] = [];
                            playerMechanicHistory[player][m].push(place);
                        });

                        // Season Stats
                        const pts = {1:3, 2:2, 3:1, 4:0}[place] || 0;
                        seasonPoints[player] = (seasonPoints[player] || 0) + pts;
                        seasonGamesPlayed[player] = (seasonGamesPlayed[player] || 0) + 1;
                        
                        const opps = podPlayers.filter(p => p !== player);
                        const oppAvgThisGame = calculateAverage(opps.map(o => calculateAverage(playerHistory[o]?.placements || [])));
                        seasonOpponentSum[player] = (seasonOpponentSum[player] || 0) + oppAvgThisGame;
                    });

                    allPastGames.push({ year: year, week: weekName, players: podResults });
                }
            });
        });

        // End of Season Updates
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
    console.log(`Success! Generated ${rows.length} rows with new AI features.`);

} catch (err) {
    console.error("Error processing files:", err);
}