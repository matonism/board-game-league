const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const OUTPUT_DIR = path.join(__dirname, 'output');
const ANALYSIS_DIR = path.join(__dirname, 'addToBuild/weeklyReport');
const DATA_FILE = path.join(OUTPUT_DIR, 'Schedules.txt');
const HTML_FILE = path.join(ANALYSIS_DIR, 'index.html');

// SCORING
const POINTS = { 1: 3, 2: 2, 3: 1, 4: 0 };

// PLAYER GENDERS (M/F)
const PLAYER_GENDERS = {
    'Michael': 'M', 'Nick': 'M', 'Richie': 'M', 'Austin': 'M', 'Luke': 'M', 'Josh': 'M', 
    'Dan': 'M', 'Ryan': 'M', 'Tyler': 'M', 'Steve': 'M', 'Jack M': 'M', 'Jack C': 'M', 
    'Cody': 'M', 'Ian': 'M', 'Sam': 'M', 'Brian': 'M',
    'Rachel F': 'F', 'Rachel M': 'F', 'Ashley': 'F', 'Carly': 'F', 'Allie': 'F', 
    'Becca': 'F', 'Emma': 'F', 'Jennie': 'F', 'Brittany': 'F'
};

// MILESTONES CONFIG
const MILESTONES = {
    career_points: 20,  // Notify every 25 points
    career_games: 10,   // Notify every 10 games
    career_wins: 5      // Notify every 5 wins
};

// LEAGUE SETTINGS
const MIN_GAMES_FOR_AVG = 5;
const STREAK_RANK_THRESHOLD = 5;
const PLAYOFF_WATCH_START_WEEK = 3; // Start reporting playoff shifts from Week 3
const MIN_GAMES_FOR_NEMESIS = 4; // Min games played against opponent to trigger "First Win" alert

if (!fs.existsSync(ANALYSIS_DIR)) {
    fs.mkdirSync(ANALYSIS_DIR);
}

/**
 * MAIN EXECUTION
 */
function main() {
    console.log("Reading data from:", DATA_FILE);

    if (!fs.existsSync(DATA_FILE)) {
        console.error("Error: output/Schedules.txt not found.");
        return;
    }

    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const scheduleData = JSON.parse(rawData);

        // 1. Parse All Games
        const allGames = parseSchedule(scheduleData);
        
        // Sort chronologically (Critical for accurate history)
        allGames.sort((a, b) => (a.season - b.season) || (a.weekIndex - b.weekIndex) || (a.gameId - b.gameId));

        if (allGames.length === 0) {
            console.log("No games found.");
            return;
        }

        // 2. Identify Unique Weeks
        const uniqueWeeks = [];
        const seenWeeks = new Set();
        
        allGames.forEach(g => {
            const key = `${g.season}-${g.weekIndex}`;
            if (!seenWeeks.has(key)) {
                seenWeeks.add(key);
                uniqueWeeks.push({
                    season: g.season,
                    weekIndex: g.weekIndex,
                    weekLabel: g.weekLabel,
                    isPostSeason: g.isPostSeason // Track if this week is playoff
                });
            }
        });

        console.log(`Found ${uniqueWeeks.length} unique weeks of history.`);

        // 3. Generate Report for EVERY Week
        const reports = [];

        uniqueWeeks.forEach(week => {
            // "Current" = All games up to and including this week
            const gamesCurrent = allGames.filter(g => 
                (g.season < week.season) || 
                (g.season === week.season && g.weekIndex <= week.weekIndex)
            );
            
            // "Previous" = All games strictly before this week
            const gamesPrevious = allGames.filter(g => 
                (g.season < week.season) || 
                (g.season === week.season && g.weekIndex < week.weekIndex)
            );

            // Players active ONLY in this specific week
            const weeklyGames = allGames.filter(g => g.season === week.season && g.weekIndex === week.weekIndex);
            
            // Get unique game names played this week
            const gameNames = [...new Set(weeklyGames.map(g => g.gameName))].join(", ");

            // Get list of players for news generation
            const activePlayersInWeek = new Set(weeklyGames.map(g => g.player));

            // Snapshots
            const snapCurrent = getSnapshot(gamesCurrent, week.season);
            const snapPrevious = getSnapshot(gamesPrevious, week.season);

            // Determine Playoff Cutoff for this specific season
            const seasonWeeks = scheduleData[week.season];
            const playoffCutoff = getPlayoffCutoff(seasonWeeks);

            // Generate Stories (Pass gamesCurrent for historical speed calculations)
            const stories = generateStories(snapPrevious, snapCurrent, activePlayersInWeek, week.weekIndex, week.isPostSeason, playoffCutoff, gamesCurrent, weeklyGames);

            // Format Standings for JSON storage
            const formattedStandings = snapCurrent.seasonStandings.map(s => {
                const prev = snapPrevious.rankLookup[s.player];
                let diff = 0;
                let isNew = false;
                if (prev) {
                    diff = prev.rank - s.rank;
                } else {
                    isNew = true;
                }
                return {
                    rank: s.rank,
                    player: s.player,
                    points: s.points,
                    diff: diff,
                    isNew: isNew
                };
            });

            // Group Weekly Results (for Playoff Display)
            const groupedResults = {};
            weeklyGames.forEach(g => {
                // Group by Game ID to keep tables together
                if (!groupedResults[g.gameId]) {
                    groupedResults[g.gameId] = {
                        gameName: g.gameName,
                        results: []
                    };
                }
                groupedResults[g.gameId].results.push({
                    player: g.player,
                    place: g.place,
                    points: g.points
                });
            });
            
            // Sort results within tables
            Object.values(groupedResults).forEach(table => {
                table.results.sort((a,b) => a.place - b.place);
            });

            reports.push({
                id: `${week.season}_${week.weekIndex}`,
                season: week.season,
                weekLabel: week.weekLabel,
                gameNames: gameNames, // ADDED GAME NAMES
                title: `Season ${week.season} - ${week.weekLabel}`,
                isPostSeason: week.isPostSeason,
                standings: formattedStandings,
                weeklyResults: Object.values(groupedResults), // Array of tables
                news: stories
            });
        });

        // Reverse so the default view is the latest
        reports.reverse();

        // 4. Generate HTML
        generateHtmlDashboard(reports);
        
        console.log(`SUCCESS: Report generated at ${HTML_FILE}`);

    } catch (err) {
        console.error("Error processing data:", err);
    }
}

// ==========================================
// HELPERS
// ==========================================

function getPlayoffCutoff(seasonWeeks) {
    if (!seasonWeeks) return 4;
    // If the schedule contains "Playoff 1", it implies an expanded bracket (8 spots).
    // If it only contains "Championship", it implies a standard bracket (4 spots).
    const hasExpandedPlayoff = seasonWeeks.some(w => w.week.includes('Playoff 1'));
    return hasExpandedPlayoff ? 8 : 4;
}

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ==========================================
// DATA SNAPSHOT ENGINE
// ==========================================

function getSnapshot(games, targetSeason) {
    // 1. Career Totals & Max Streaks
    const careerMap = {};
    const streaksMap = {}; // Active streaks
    const playerStats = []; // For record calculation

    // Helper: Map Game ID to Players in that game (for Gender/Nemesis checks)
    const gameTables = {};
    games.forEach(g => {
        if (!gameTables[g.gameId]) gameTables[g.gameId] = [];
        gameTables[g.gameId].push(g);
    });

    const byPlayer = {};
    games.forEach(g => {
        if(!byPlayer[g.player]) byPlayer[g.player] = [];
        byPlayer[g.player].push(g);
    });

    Object.keys(byPlayer).forEach(player => {
        const records = byPlayer[player];
        records.sort((a, b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));

        const totalPoints = records.reduce((sum, r) => sum + r.points, 0);
        const wins = records.filter(r => r.place === 1).length;
        const totalGames = records.length;
        
        // Reg Season Only Records
        const regRecords = records.filter(r => !r.isPostSeason);

        // Gender Streak Logic
        // We calculate this manually here
        let genderStreak = 0;
        let maxGenderStreak = 0;
        const myGender = PLAYER_GENDERS[player] || 'U'; // U for unknown
        const oppGender = myGender === 'M' ? 'F' : (myGender === 'F' ? 'M' : null);

        records.forEach(g => {
            if (!oppGender) return;
            // Who was in this game?
            const table = gameTables[g.gameId] || [];
            // Is there an opponent of the opposite gender?
            const hasOppGender = table.some(p => p.player !== player && PLAYER_GENDERS[p.player] === oppGender);
            
            if (hasOppGender) {
                // Did I lose to ANY of them? (i.e., did any of them have a lower place than me?)
                // Note: Lower place is better (1st < 2nd)
                const lostToOppGender = table.some(p => p.player !== player && PLAYER_GENDERS[p.player] === oppGender && p.place < g.place);
                
                if (!lostToOppGender) {
                    genderStreak++;
                    if (genderStreak > maxGenderStreak) maxGenderStreak = genderStreak;
                } else {
                    genderStreak = 0;
                }
            }
            // If no opposite gender present, streak pauses (maintains value)
        });

        // Active Streaks (Current run from most recent game backwards)
        streaksMap[player] = {
            winStreak: getActiveStreakCount(records, r => r.place === 1),
            topHalfStreak: getActiveStreakCount(records, r => r.place <= 2),
            noLastStreak: getActiveStreakCount(records, r => r.place !== 4),
            // Regular Season Versions (for context)
            regWinStreak: getActiveStreakCount(regRecords, r => r.place === 1),
            regTopHalfStreak: getActiveStreakCount(regRecords, r => r.place <= 2),
            regNoLastStreak: getActiveStreakCount(regRecords, r => r.place !== 4),
            // Gender Streak (Calculated above)
            genderStreak: genderStreak
        };

        // Historical Max Streaks (Best run ever in history)
        
        const maxStreaks = {
            all: {
                win: getMaxStreakCount(records, r => r.place === 1),
                top2: getMaxStreakCount(records, r => r.place <= 2),
                safe: getMaxStreakCount(records, r => r.place !== 4),
                winless: getMaxStreakCount(records, r => r.place !== 1),
                gender: maxGenderStreak // Added
            },
            reg: {
                win: getMaxStreakCount(regRecords, r => r.place === 1),
                top2: getMaxStreakCount(regRecords, r => r.place <= 2),
                safe: getMaxStreakCount(regRecords, r => r.place !== 4),
                winless: getMaxStreakCount(regRecords, r => r.place !== 1)
            }
        };

        careerMap[player] = {
            points: totalPoints,
            wins: wins,
            games: totalGames
        };

        playerStats.push({
            player,
            points: totalPoints,
            average: totalGames > 0 ? totalPoints / totalGames : 0,
            games: totalGames,
            maxStreaks,
            gender: myGender
        });
    });

    // 2. Determine League Records
    const leagueRecords = {
        most_points: getLeader(playerStats, p => p.points),
        best_average: getLeader(playerStats, p => p.games >= MIN_GAMES_FOR_AVG ? p.average : -1),
        
        streak_win_all: getLeader(playerStats, p => p.maxStreaks.all.win),
        streak_win_reg: getLeader(playerStats, p => p.maxStreaks.reg.win),
        
        streak_top2_all: getLeader(playerStats, p => p.maxStreaks.all.top2),
        streak_top2_reg: getLeader(playerStats, p => p.maxStreaks.reg.top2),
        
        streak_safe_all: getLeader(playerStats, p => p.maxStreaks.all.safe),
        streak_safe_reg: getLeader(playerStats, p => p.maxStreaks.reg.safe),

        streak_winless_all: getLeader(playerStats, p => p.maxStreaks.all.winless), 
        streak_winless_reg: getLeader(playerStats, p => p.maxStreaks.reg.winless),

        // NEW: Gender Records
        streak_gender_m: getLeader(playerStats, p => p.gender === 'M' ? p.maxStreaks.all.gender : -1),
        streak_gender_f: getLeader(playerStats, p => p.gender === 'F' ? p.maxStreaks.all.gender : -1)
    };

    // 3. Season Standings (Regular Season Only)
    const seasonGames = games.filter(g => g.season === targetSeason && !g.isPostSeason);
    const seasonMap = {};
    
    seasonGames.forEach(g => {
        if (!seasonMap[g.player]) {
            seasonMap[g.player] = { 
                player: g.player, 
                points: 0,
                // Track placements for tie-breaking
                places: { 1: 0, 2: 0, 3: 0, 4: 0 }
            };
        }
        seasonMap[g.player].points += g.points;
        if (seasonMap[g.player].places[g.place] !== undefined) {
            seasonMap[g.player].places[g.place]++;
        }
    });

    // Sort with Tie-Breakers: Points -> 1sts -> 2nds -> 3rds
    const standings = Object.values(seasonMap).sort((a,b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.places[1] !== a.places[1]) return b.places[1] - a.places[1];
        if (b.places[2] !== a.places[2]) return b.places[2] - a.places[2];
        if (b.places[3] !== a.places[3]) return b.places[3] - a.places[3];
        return 0;
    });

    const rankedStandings = [];
    let rank = 1;
    for(let i=0; i<standings.length; i++) {
        if (i > 0) {
            const prev = standings[i-1];
            const curr = standings[i];
            
            // Check if strictly worse than previous to increment rank
            // (Tie if points, 1sts, 2nds, and 3rds are identical)
            const isTied = (prev.points === curr.points) &&
                           (prev.places[1] === curr.places[1]) &&
                           (prev.places[2] === curr.places[2]) &&
                           (prev.places[3] === curr.places[3]);
            
            if (!isTied) {
                rank = i + 1;
            }
        }
        rankedStandings.push({
            ...standings[i],
            rank: rank
        });
    }

    const rankLookup = {};
    rankedStandings.forEach(s => rankLookup[s.player] = s);

    return {
        career: careerMap,
        streaks: streaksMap,
        seasonStandings: rankedStandings,
        rankLookup: rankLookup,
        leagueRecords: leagueRecords,
        playerStats: playerStats
    };
}

function getLeader(stats, valueSelector) {
    let maxVal = -1;
    let holders = [];
    
    stats.forEach(p => {
        const val = valueSelector(p);
        if (val > maxVal) {
            maxVal = val;
            holders = [p.player];
        } else if (val === maxVal && val > 0) { // Only tie if > 0
            holders.push(p.player);
        }
    });

    return { value: maxVal, holders: holders.sort() };
}

function getActiveStreakCount(records, predicate) {
    let count = 0;
    for (let i = records.length - 1; i >= 0; i--) {
        if (predicate(records[i])) count++;
        else break;
    }
    return count;
}

function getMaxStreakCount(records, predicate) {
    let max = 0;
    let current = 0;
    for (const r of records) {
        if (predicate(r)) {
            current++;
            if (current > max) max = current;
        } else {
            current = 0;
        }
    }
    return max;
}

// ==========================================
// STORY GENERATOR
// ==========================================

const RECORD_TITLES = {
    most_points: "All-Time Points Leader",
    best_average: "Highest Career Average",
    streak_win_all: "Longest Win Streak (All-Time)",
    streak_win_reg: "Longest Win Streak (Regular Season)",
    streak_top2_all: "Longest Top-2 Streak (All-Time)",
    streak_top2_reg: "Longest Top-2 Streak (Regular Season)",
    streak_safe_all: "Longest No-4th Streak (All-Time)",
    streak_safe_reg: "Longest No-4th Streak (Regular Season)",
    streak_winless_all: "Longest Winless Streak (All-Time)", 
    streak_winless_reg: "Longest Winless Streak (Regular Season)",
    streak_gender_m: "Battle of the Sexes (Men)", // NEW
    streak_gender_f: "Battle of the Sexes (Women)" // NEW
};

function generateStories(prev, curr, activePlayers, weekIndex, isPostSeason, playoffCutoff, gamesHistory, weeklyGames) {
    const stories = {
        records: [],
        milestones: [],
        rankChanges: [],
        streakEvents: [],
        playoffWatch: [],
        nemesis: []
    };

    // 1. PLAYOFF WATCH (Week 3+ Regular Season)
    if (weekIndex >= PLAYOFF_WATCH_START_WEEK && !isPostSeason) {
        activePlayers.forEach(player => {
            const rPrev = prev.rankLookup[player];
            const rCurr = curr.rankLookup[player];

            if (rPrev && rCurr) {
                const prevIn = rPrev.rank <= playoffCutoff;
                const currIn = rCurr.rank <= playoffCutoff;
                
                if (!prevIn && currIn) {
                    stories.playoffWatch.push({
                        player,
                        type: 'rise',
                        text: `<strong>${player}</strong> has risen into playoff contention (Rank ${rCurr.rank})!`
                    });
                } else if (prevIn && !currIn) {
                    stories.playoffWatch.push({
                        player,
                        type: 'fall',
                        text: `<strong>${player}</strong> has fallen out of playoff position (Rank ${rCurr.rank}).`
                    });
                }
            }
        });
    }

    // 2. DETECT RECORD BREAKERS (Includes Winless & Gender)
    if (prev.leagueRecords && curr.leagueRecords) {
        Object.keys(curr.leagueRecords).forEach(key => {
            const pRec = prev.leagueRecords[key];
            const cRec = curr.leagueRecords[key];
            const recordName = RECORD_TITLES[key] || key;
            const formatVal = (val) => key === 'best_average' ? val.toFixed(2) : val;

            const activeHolder = cRec.holders.find(h => activePlayers.has(h));
            if (!activeHolder) return; 

            const isStreakRecord = key.startsWith('streak_');
            const isNegativeRecord = key.includes('winless');

            // CASE A: NEW RECORD VALUE
            if (cRec.value > pRec.value) {
                const heldBySelf = arraysEqual(pRec.holders, cRec.holders);
                
                if (heldBySelf && !isStreakRecord) return; 

                if (heldBySelf && isStreakRecord) {
                    stories.records.push({
                        type: 'break',
                        player: cRec.holders.join(' & '),
                        title: `Record Extended!`,
                        text: `<strong>${cRec.holders.join(' & ')}</strong> extends the <strong>${recordName}</strong> record to <strong>${formatVal(cRec.value)}</strong> games!`,
                        isNegative: isNegativeRecord
                    });
                } else {
                    const prevLeaderTxt = pRec.holders.length > 0 ? ` (was ${pRec.holders.join(', ')}: ${formatVal(pRec.value)})` : '';
                    stories.records.push({
                        type: 'break',
                        player: cRec.holders.join(' & '),
                        title: `New League Record!`,
                        text: `<strong>${cRec.holders.join(' & ')}</strong> set a new <strong>${recordName}</strong> of <strong>${formatVal(cRec.value)}</strong>!${prevLeaderTxt}`,
                        isNegative: isNegativeRecord
                    });
                }
            }
            // CASE B: TIE RECORD
            else if (cRec.value === pRec.value && cRec.value > 0) {
                const newHolders = cRec.holders.filter(h => !pRec.holders.includes(h));
                if (newHolders.length > 0) {
                    stories.records.push({
                        type: 'tie',
                        player: newHolders.join(' & '),
                        title: `Record Tied!`,
                        text: `<strong>${newHolders.join(' & ')}</strong> tied the <strong>${recordName}</strong> with <strong>${formatVal(cRec.value)}</strong> (held by ${pRec.holders.join(', ')}).`,
                        isNegative: isNegativeRecord
                    });
                }
            }
            // CASE C: TAKEOVER
            else if (key === 'best_average' && !arraysEqual(cRec.holders, pRec.holders)) {
                 const newLeaders = cRec.holders.filter(h => !pRec.holders.includes(h));
                 if (newLeaders.length > 0) {
                     stories.records.push({
                        type: 'takeover',
                        player: newLeaders.join(' & '),
                        title: `New #1 Rank`,
                        text: `<strong>${newLeaders.join(' & ')}</strong> takes over #1 for <strong>${recordName}</strong> with <strong>${formatVal(cRec.value)}</strong>.`
                     });
                 }
            }
        });
    }

    // 3. NEMESIS CHECK (First win against an opponent)
    if (weeklyGames && weeklyGames.length > 0) {
        // Group weekly games by table
        const tables = {};
        weeklyGames.forEach(g => {
            if(!tables[g.gameId]) tables[g.gameId] = [];
            tables[g.gameId].push(g);
        });

        // Group TOTAL history by gameId to check prior results
        const historyTables = {};
        gamesHistory.forEach(g => {
            if(!historyTables[g.gameId]) historyTables[g.gameId] = [];
            historyTables[g.gameId].push(g);
        });

        Object.values(tables).forEach(table => {
            // For every player in this table
            for (let i = 0; i < table.length; i++) {
                const p1 = table[i];
                for (let j = 0; j < table.length; j++) {
                    if (i === j) continue;
                    const p2 = table[j];

                    // Check if P1 Beat P2 (Lower place is better)
                    if (p1.place < p2.place) {
                        // Check History: Has P1 ever placed higher than P2 before?
                        // Also count total games played against each other
                        let gamesPlayedTogether = 0;
                        let priorWins = 0;

                        // Check all history
                        Object.values(historyTables).forEach(histTable => {
                            const hP1 = histTable.find(p => p.player === p1.player);
                            const hP2 = histTable.find(p => p.player === p2.player);
                            
                            if (hP1 && hP2) {
                                gamesPlayedTogether++;
                                // Only count PRIOR wins (exclude current game ID if it happens to be in history already, which it is)
                                if (hP1.gameId !== p1.gameId) {
                                    if (hP1.place < hP2.place) priorWins++;
                                }
                            }
                        });

                        // If played enough games, and this is the FIRST win
                        if (gamesPlayedTogether >= MIN_GAMES_FOR_NEMESIS && priorWins === 0) {
                            stories.nemesis.push({
                                player: p1.player,
                                opponent: p2.player,
                                count: gamesPlayedTogether
                            });
                        }
                    }
                }
            }
        });
    }

    // Helper to get historical rank for streaks
    const getStreakRank = (value, type) => {
        if (!curr.playerStats) return null;
        const allMaxStreaks = curr.playerStats.map(p => p.maxStreaks.all[type]).sort((a,b) => b-a);
        const index = allMaxStreaks.indexOf(value);
        return index + 1;
    };

    activePlayers.forEach(player => {
        const pPrev = prev.career[player] || { points: 0, wins: 0, games: 0 };
        const pCurr = curr.career[player];
        
        const sPrev = prev.streaks[player] || { winStreak: 0, topHalfStreak: 0, noLastStreak: 0 };
        const sCurr = curr.streaks[player];

        const rPrev = prev.rankLookup[player];
        const rCurr = curr.rankLookup[player];

        // 4. CAREER MILESTONES
        if (pCurr) {
            checkMilestone(player, "Career Points", pPrev.points, pCurr.points, MILESTONES.career_points, stories.milestones, gamesHistory);
            checkMilestone(player, "Career Games", pPrev.games, pCurr.games, MILESTONES.career_games, stories.milestones);
            checkMilestone(player, "Career Wins", pPrev.wins, pCurr.wins, MILESTONES.career_wins, stories.milestones);
        }

        // 5. SEASON RANK CHANGES
        if (rPrev && rCurr) {
            const diff = rPrev.rank - rCurr.rank;
            if (diff !== 0) {
                stories.rankChanges.push({
                    player,
                    prevRank: rPrev.rank,
                    currRank: rCurr.rank,
                    diff: diff,
                    prevPoints: rPrev.points,
                    currPoints: rCurr.points
                });
            }
        } else if (!rPrev && rCurr) {
            stories.rankChanges.push({
                player,
                prevRank: "-",
                currRank: rCurr.rank,
                diff: 0,
                isNew: true,
                currPoints: rCurr.points
            });
        }

        // 6. ACTIVE STREAKS
        if (sCurr && sPrev) {
            const addStreak = (typeKey, label, sCurrObj, sPrevObj, regKey) => {
                const currentVal = sCurrObj[typeKey];
                const prevVal = sPrevObj[typeKey];
                
                // Regular Season specific values
                const currentRegVal = sCurrObj[regKey];
                const prevRegVal = sPrevObj[regKey];

                const minForNotability = (typeKey === 'noLastStreak' ? 5 : (typeKey === 'topHalfStreak' ? 3 : 2));

                // A. HEATING UP (Active Streak)
                if (currentVal >= 2 && currentVal > prevVal) {
                    const rank = getStreakRank(currentVal, typeKey === 'winStreak' ? 'win' : (typeKey === 'topHalfStreak' ? 'top2' : 'safe'));
                    let subtext = '';
                    if (rank && rank <= STREAK_RANK_THRESHOLD) {
                        subtext = `(${getOrdinal(rank)} Longest All-Time)`;
                    }
                    
                    // Check if regular season streak is notably longer (at least 2 more)
                    let displayVal = currentVal;
                    let displayLabel = label;
                    if (currentRegVal > currentVal + 1) {
                        displayVal = currentRegVal;
                        displayLabel += " (Reg. Season)";
                    }

                    if (displayVal >= minForNotability) {
                        stories.streakEvents.push({ 
                            player, type: displayLabel, count: displayVal, status: 'Active', 
                            subtext: subtext 
                        });
                    }
                } 
                // B. SNAPPED (Ended Streak)
                else if (prevVal >= 2 && currentVal === 0) {
                     // Check if regular season streak was longer
                     let displayVal = prevVal;
                     let displayLabel = label;
                     if (prevRegVal > prevVal + 1) {
                         displayVal = prevRegVal;
                         displayLabel += " (Reg. Season)";
                     }

                     if (displayVal >= minForNotability) {
                        stories.streakEvents.push({ player, type: displayLabel, count: displayVal, status: 'Snapped' });
                     }
                }
            };

            addStreak('winStreak', 'Win Streak', sCurr, sPrev, 'regWinStreak');
            addStreak('topHalfStreak', 'Top 2 Streak', sCurr, sPrev, 'regTopHalfStreak');
            addStreak('noLastStreak', 'Safety Streak (Avoiding 4th Place)', sCurr, sPrev, 'regNoLastStreak');

            // NEW: Gender Streak (Manual Check)
            if (sCurr.genderStreak >= 3 && sCurr.genderStreak > sPrev.genderStreak) {
                // If it's a new personal best or notable
                stories.streakEvents.push({
                    player, 
                    type: "Battle of the Sexes Streak", 
                    count: sCurr.genderStreak, 
                    status: 'Active',
                    subtext: "(Games without losing to opposite gender)"
                });
            } else if (sPrev.genderStreak >= 3 && sCurr.genderStreak === 0) {
                stories.streakEvents.push({
                    player, 
                    type: "Battle of the Sexes Streak", 
                    count: sPrev.genderStreak, 
                    status: 'Snapped'
                });
            }
        }
    });

    // --- SORTING ---
    stories.rankChanges.sort((a,b) => b.diff - a.diff);
    stories.milestones.sort((a, b) => b.milestone - a.milestone);
    stories.streakEvents.sort((a, b) => b.count - a.count);
    stories.playoffWatch.sort((a,b) => a.type === 'rise' ? -1 : 1); // Rises first

    return stories;
}

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    a.sort(); b.sort();
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function checkMilestone(player, label, prevVal, currVal, interval, targetArray, gamesHistory) {
    const prevBucket = Math.floor(prevVal / interval);
    const currBucket = Math.floor(currVal / interval);
    
    if (currBucket > prevBucket) {
        const milestoneVal = currBucket * interval;
        let speedInfo = null;

        // Calculate speed only for Career Points (uses passed gamesHistory)
        if (label === "Career Points" && gamesHistory) {
            speedInfo = getMilestoneSpeedRank(player, milestoneVal, gamesHistory);
        }

        targetArray.push({
            player,
            milestone: milestoneVal,
            label: label,
            value: currVal,
            speed: speedInfo
        });
    }
}

function getMilestoneSpeedRank(targetPlayer, milestone, games) {
    const runningPoints = {};
    const runningGames = {};
    const records = [];
    const finished = new Set();

    for (const g of games) {
        if (!runningPoints[g.player]) runningPoints[g.player] = 0;
        if (!runningGames[g.player]) runningGames[g.player] = 0;

        runningPoints[g.player] += g.points;
        runningGames[g.player] += 1;

        if (runningPoints[g.player] >= milestone && !finished.has(g.player)) {
            finished.add(g.player);
            records.push({ player: g.player, games: runningGames[g.player] });
        }
    }

    // Sort by games (asc)
    records.sort((a, b) => a.games - b.games);

    let rank = 1;
    for (let i = 0; i < records.length; i++) {
        if (i > 0 && records[i].games > records[i-1].games) {
            rank = i + 1;
        }
        if (records[i].player === targetPlayer) {
            // Check for ties
            const tiedCount = records.filter(r => r.games === records[i].games).length;
            return {
                games: records[i].games,
                rank: rank,
                total: records.length,
                isTie: tiedCount > 1
            };
        }
    }
    return null;
}

// ==========================================
// HTML GENERATOR
// ==========================================

function generateHtmlDashboard(reports) {
    const latest = reports[0];
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>League Weekly Report</title>
    <style>
        :root { 
            --bg: #f1f5f9; 
            --surface: #ffffff; 
            --text: #1e293b; 
            --primary: #3b82f6; 
            --primary-dark: #2563eb;
            --success: #22c55e;
            --danger: #ef4444;
            --warning: #eab308;
            --record: #8b5cf6; 
            --playoff: #6366f1; /* Indigo for playoffs */
            --border: #e2e8f0;
            --text-muted: #64748b;
        }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; position: relative; }
                /* Back Button */
        .back-btn {
            position: absolute;
            top: 0;
            left: 0;
            text-decoration: none;
            color: var(--primary);
            font-weight: 600;
            padding: 8px 15px;
            background: white;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 0.9em;
            transition: all 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .back-btn:hover { background: #f1f5f9; }

        
        /* Header */
        header { text-align: center; margin-bottom: 25px; margin-top: 10px; }
        h1 { margin: 0; color: var(--text); font-size: 1.8em; margin-bottom: 5px;}
        .subtitle { color: var(--text-muted); font-size: 1.1em; }
        
        /* Navigation */
        .nav-container { margin-bottom: 30px; display: flex; flex-direction: column; align-items: center; gap: 15px; }
        .nav-group { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .nav-btn { background: var(--surface); border: 1px solid var(--border); padding: 8px 16px; border-radius: 20px; cursor: pointer; color: var(--text-muted); font-size: 0.9em; transition: all 0.2s ease; font-weight: 500; }
        .nav-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: var(--text); }
        .nav-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.4); }
        .season-btn { font-size: 1em; padding: 10px 24px; }
        .week-btn { font-size: 0.85em; }

        /* Grid */
        .layout-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media(min-width: 768px) { .layout-grid { grid-template-columns: 2fr 3fr; } }

        /* Card Styles */
        .panel { background: var(--surface); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); height: fit-content; margin-bottom: 20px; }
        .panel h2 { margin-top: 0; font-size: 1.2em; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 15px; }

        /* Tabbed Highlight Section */
        .highlight-tabs { display: flex; border-bottom: 2px solid var(--border); margin-bottom: 15px; }
        .tab-btn { padding: 10px 20px; cursor: pointer; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
        .tab-btn:hover { color: var(--primary); }
        .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
        
        /* FIX: Ensure tab content visibility logic overrides .news-stack display */
        .tab-content { display: none !important; }
        .tab-content.active { display: flex !important; flex-direction: column; gap: 12px; animation: fadeIn 0.3s ease-in; }

        /* News Cards */
        .news-stack { display: flex; flex-direction: column; gap: 12px; }
        .news-card { display: flex; align-items: center; padding: 12px; border-radius: 8px; border-left: 4px solid #ccc; background: #f8fafc; animation: fadeIn 0.3s ease-in; }
        .card-icon { font-size: 1.5em; margin-right: 15px; width: 40px; text-align: center; }
        .card-content { flex: 1; }
        .card-title { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b; margin-bottom: 2px; }
        .card-text { font-size: 0.95em; line-height: 1.4; }
        .sub-text { display: block; font-size: 0.85em; color: #64748b; margin-top: 2px; }

        /* Card Types */
        .news-card.record { border-color: var(--record); background: #f3e8ff; }
        .news-card.record-bad { border-color: var(--text-muted); background: #f1f5f9; } /* New style for bad records */
        .news-card.milestone { border-color: var(--warning); background: #fefce8; }
        .news-card.climb { border-color: var(--success); background: #f0fdf4; }
        .news-card.fall { border-color: var(--danger); background: #fef2f2; }
        .news-card.streak { border-color: #f97316; background: #fff7ed; }
        .news-card.snap { border-color: #64748b; background: #f1f5f9; opacity: 0.8; }
        .news-card.playoff-rise { border-color: var(--playoff); background: #e0e7ff; }
        .news-card.playoff-fall { border-color: var(--text-muted); background: #f3f4f6; }
        .news-card.nemesis { border-color: #ec4899; background: #fdf2f8; } /* Pink for Nemesis */

        /* Standings Table */
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; color: #64748b; font-size: 0.8em; text-transform: uppercase; padding-bottom: 10px; }
        td { padding: 8px 0; border-bottom: 1px solid var(--border); font-weight: 500; }
        tr:last-child td { border-bottom: none; }
        .rank-col { width: 30px; color: #94a3b8; font-weight: 700; }
        .move-col { width: 40px; font-size: 0.8em; font-weight: 700; }
        .pts-col { text-align: right; font-weight: 700; color: var(--primary); }
        
        .positive { color: var(--success); }
        .negative { color: var(--danger); }
        .neutral { color: #cbd5e1; }
        .new { color: var(--primary); font-size: 0.8em; background: #eff6ff; padding: 2px 6px; border-radius: 4px; }
        .dash { color: #cbd5e1; }

        /* Playoff Table */
        .playoff-header { background: var(--playoff); color: white; padding: 5px 10px; border-radius: 4px; font-size: 0.9em; margin-bottom: 10px; display:inline-block;}
        .result-group { margin-bottom: 15px; border: 1px solid var(--border); border-radius: 8px; padding: 10px; }
        .result-title { font-weight: 700; margin-bottom: 5px; color: var(--text-muted); font-size: 0.9em; }

        .empty-state { text-align: center; color: #94a3b8; padding: 20px; font-style: italic; }
        
        @media (max-width: 600px) {
            .back-btn { position: static; display: inline-block; margin-bottom: 15px; }
            header { text-align: center; }
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    
    <div class="container">
        <header>
            <a href="https://bglcompanion.com" class="back-btn">&larr; Back to BGL</a>
            <h1>BGL Weekly Report</h1>
            <div class="subtitle" id="currentTitle">Select a week</div>
        </header>

        <div class="nav-container">
            <div id="season-nav" class="nav-group"></div>
            <div id="week-nav" class="nav-group"></div>
        </div>

        <div class="layout-grid">
            <!-- Left Column: Standings -->
            <div class="left-col">
                <!-- Playoff Results (Hidden by default) -->
                <div id="playoffPanel" class="panel" style="display:none">
                    <h2>Playoff Results</h2>
                    <div id="playoffBody"></div>
                </div>

                <div class="panel">
                    <h2>Season Standings</h2>
                    <table id="standingsTable">
                        <thead>
                            <tr><th>#</th><th>+/-</th><th>Player</th><th style="text-align:right">Pts</th></tr>
                        </thead>
                        <tbody id="standingsBody">
                            <!-- Content -->
                        </tbody>
                    </table>
                    <div id="standingsEmpty" style="display:none" class="empty-state">No standings data</div>
                </div>
            </div>

            <!-- Right Column: News Feed -->
            <div class="panel">
                <div class="highlight-tabs">
                    <div class="tab-btn active" onclick="switchTab('news')">News</div>
                    <div class="tab-btn" onclick="switchTab('streaks')">Streaks</div>
                </div>
                
                <div id="news-tab" class="tab-content active news-stack">
                    <!-- General News Content -->
                </div>
                <div id="streaks-tab" class="tab-content news-stack">
                    <!-- Streak Content -->
                </div>
            </div>
        </div>
    </div>

    <script>
        const REPORTS = ${JSON.stringify(reports)};
        const BY_SEASON = {};
        REPORTS.forEach((r, idx) => {
            if (!BY_SEASON[r.season]) BY_SEASON[r.season] = [];
            BY_SEASON[r.season].push({ ...r, index: idx });
        });
        const SEASONS = Object.keys(BY_SEASON).sort((a,b) => b - a);
        let currentSeason = SEASONS[0];
        let currentIndex = 0;

        function getOrdinal(n) {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        }

        function init() {
            renderSeasonNav();
            selectReport(0);
        }
        
        function switchTab(tabName) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            document.querySelector(\`.tab-btn[onclick="switchTab('\${tabName}')"]\`).classList.add('active');
            document.getElementById(\`\${tabName}-tab\`).classList.add('active');
        }

        function renderSeasonNav() {
            document.getElementById('season-nav').innerHTML = SEASONS.sort((a,b) => a - b).map(s => 
                \`<button class="nav-btn season-btn \${s == currentSeason ? 'active' : ''}" onclick="selectSeason(\${s})">\${s}</button>\`
            ).join('');
        }

        function selectSeason(season) {
            currentSeason = season;
            renderSeasonNav();
            renderWeekNav(season);
        }

        function renderWeekNav(season) {
            const weeks = [...BY_SEASON[season]].reverse();
            document.getElementById('week-nav').innerHTML = weeks.map(w => 
                \`<button class="nav-btn week-btn \${w.index === currentIndex ? 'active' : ''}" onclick="selectReport(\${w.index})">\${w.weekLabel}</button>\`
            ).join('');
        }

        function selectReport(index) {
            currentIndex = index;
            const data = REPORTS[index];
            if (data.season != currentSeason) { currentSeason = data.season; renderSeasonNav(); }
            renderWeekNav(currentSeason);
            
            // Header with Game Name
            let headerHtml = data.title;
            if (data.gameNames) {
                headerHtml += \`<br><span style="font-size:0.8em; color:#6366f1; font-weight:600">\${data.gameNames}</span>\`;
            }
            document.getElementById('currentTitle').innerHTML = headerHtml;

            const playoffPanel = document.getElementById('playoffPanel');
            const playoffBody = document.getElementById('playoffBody');
            
            // 1. Playoff Results
            if (data.isPostSeason && data.weeklyResults.length > 0) {
                playoffPanel.style.display = 'block';
                let html = '';
                data.weeklyResults.forEach(table => {
                    html += \`<div class="result-group"><div class="result-title">\${table.gameName}</div><table>\`;
                    table.results.forEach(r => {
                        html += \`<tr>
                            <td class="rank-col">\${r.place}</td>
                            <td class="player-col">\${r.player}</td>
                            <td class="pts-col">\${r.points || '-'}</td>
                        </tr>\`;
                    });
                    html += \`</table></div>\`;
                });
                playoffBody.innerHTML = html;
            } else {
                playoffPanel.style.display = 'none';
            }

            // 2. Standings
            const tbody = document.getElementById('standingsBody');
            const stdTable = document.getElementById('standingsTable');
            const stdEmpty = document.getElementById('standingsEmpty');
            
            tbody.innerHTML = '';
            if (!data.standings || data.standings.length === 0) {
                stdTable.style.display = 'none';
                stdEmpty.style.display = 'block';
            } else {
                stdTable.style.display = 'table';
                stdEmpty.style.display = 'none';
                data.standings.forEach(s => {
                    let moveIcon = '<span class="dash">-</span>';
                    let moveClass = 'neutral';
                    if (s.isNew) { moveIcon = '<span class="new">NEW</span>'; }
                    else if (s.diff > 0) { moveIcon = '▲ ' + s.diff; moveClass = 'positive'; }
                    else if (s.diff < 0) { moveIcon = '▼ ' + Math.abs(s.diff); moveClass = 'negative'; }
                    
                    const isChamp = s.rank === 1 ? '👑' : '';
                    tbody.innerHTML += \`<tr>
                        <td class="rank-col">\${s.rank}</td>
                        <td class="move-col \${moveClass}">\${moveIcon}</td>
                        <td class="player-col">\${s.player} \${isChamp}</td>
                        <td class="pts-col">\${s.points}</td>
                    </tr>\`;
                });
            }

            // 3. Populate News & Streaks Tabs
            let newsHtml = '';
            let streaksHtml = '';
            const news = data.news;

            // --- NEWS TAB CONTENT ---
            // Playoff Watch
            if (news.playoffWatch) {
                news.playoffWatch.forEach(p => {
                    const style = p.type === 'rise' ? 'playoff-rise' : 'playoff-fall';
                    const icon = p.type === 'rise' ? '📈' : '⚠️';
                    const title = p.type === 'rise' ? 'Playoff Contention' : 'Playoff Danger';
                    newsHtml += createCard(style, icon, title, p.text);
                });
            }

            // League Records
            if (news.records) {
                news.records.forEach(r => {
                    const style = r.isNegative ? 'record-bad' : 'record';
                    const icon = r.isNegative ? '🕸️' : '👑';
                    newsHtml += createCard(style, icon, r.title, r.text);
                });
            }
            
            // Nemesis
            if (news.nemesis) {
                news.nemesis.forEach(n => {
                    newsHtml += createCard('nemesis', '⚔️', 'Nemesis Defeated', 
                        \`<strong>\${n.player}</strong> finally beat <strong>\${n.opponent}</strong>!\`,
                        \`(First win in \${n.count} games)\`);
                });
            }
            
            // Milestones & Rank Changes
            news.milestones.forEach(m => {
                let subtext = \`(Current Total: \${m.value})\`;
                if (m.speed) {
                    const ord = getOrdinal(m.speed.rank);
                    const tiePrefix = m.speed.isTie ? "Tied for " : "";
                    subtext += \` <br><span style="font-size:0.9em; color:#6366f1">Reached in \${m.speed.games} games (\${tiePrefix}\${ord} Fastest All-Time)</span>\`;
                }
                newsHtml += createCard('milestone', '🏆', 'Historic Milestone', 
                    \`<strong>\${m.player}</strong> has crossed <strong>\${m.milestone}+</strong> \${m.label}! \`,
                    subtext
                );
            });
            news.rankChanges.filter(r => r.diff >= 3).forEach(r => newsHtml += createCard('climb', '🚀', 'Big Mover', \`<strong>\${r.player}</strong> climbed <strong>\${r.diff}</strong> spots to rank #\${r.currRank}.\`));
            news.rankChanges.filter(r => r.diff <= -3).forEach(r => newsHtml += createCard('fall', '📉', 'Sliding Down', \`<strong>\${r.player}</strong> fell <strong>\${Math.abs(r.diff)}</strong> spots to rank #\${r.currRank}.\`));
            
            if (newsHtml === '') newsHtml = '<div class="empty-state">No general news this week.</div>';
            document.getElementById('news-tab').innerHTML = newsHtml;

            // --- STREAKS TAB CONTENT ---
            news.streakEvents.forEach(s => {
                if(s.status === 'Active') {
                    streaksHtml += createCard('streak', '🔥', 'Heating Up', \`<strong>\${s.player}</strong> extends their \${s.type} to <strong>\${s.count}</strong> games.\`, s.subtext);
                } else {
                    streaksHtml += createCard('snap', '💔', 'Streak Snapped', \`<strong>\${s.player}</strong>'s streak of <strong>\${s.count}</strong> \${s.type}s has ended.\`);
                }
            });

            if (streaksHtml === '') streaksHtml = '<div class="empty-state">No streak updates this week.</div>';
            document.getElementById('streaks-tab').innerHTML = streaksHtml;
        }

        function createCard(type, icon, title, text, subtext = '') {
            return \`<div class="news-card \${type}">
                <div class="card-icon">\${icon}</div>
                <div class="card-content">
                    <div class="card-title">\${title}</div>
                    <div class="card-text">\${text}
                        \${subtext ? '<span class="sub-text">' + subtext + '</span>' : ''}
                    </div>
                </div>
            </div>\`;
        }

        init();
    </script>
</body>
</html>
    `;
    fs.writeFileSync(HTML_FILE, htmlContent);
}

// ==========================================
// PARSING UTILITIES
// ==========================================

function parseSchedule(data) {
    const games = [];
    let gameIdCounter = 1;

    for (const [seasonStr, weeks] of Object.entries(data)) {
        const season = parseInt(seasonStr);
        weeks.forEach(weekData => {
            const weekLabel = weekData.week;
            const weekIndex = getWeekSortIndex(weekLabel);
            const isPostSeason = weekLabel.includes('Playoff') || weekLabel.includes('Championship');
            
            if (weekData.results) {
                weekData.results.forEach(table => {
                    const currentGameId = gameIdCounter++;
                    if (table.players) {
                        table.players.forEach(p => {
                            if (p.placement) {
                                const place = parseInt(p.placement);
                                games.push({
                                    gameId: currentGameId,
                                    season: season,
                                    weekLabel: weekLabel,
                                    weekIndex: weekIndex,
                                    isPostSeason: isPostSeason,
                                    gameName: weekData.game,
                                    player: p.player,
                                    place: place,
                                    points: POINTS[place] || 0
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
    if (label.startsWith("Week")) return parseInt(label.split(' ')[1]);
    if (label.includes("Playoff 1")) return 20;
    if (label.includes("Playoff 2")) return 21;
    if (label.includes("Championship")) return 22;
    return 99;
}

// Execute
main();