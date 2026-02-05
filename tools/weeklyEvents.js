const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const OUTPUT_DIR = path.join(__dirname, 'output');
const ANALYSIS_DIR = path.join(__dirname, 'analysis');
const DATA_FILE = path.join(OUTPUT_DIR, 'Schedules.txt');
const HTML_FILE = path.join(ANALYSIS_DIR, 'weekly_delta_report.html');

// SCORING
const POINTS = { 1: 3, 2: 2, 3: 1, 4: 0 };

// MILESTONES CONFIG
const MILESTONES = {
    career_points: 25,  // Notify every 25 points
    career_games: 10,   // Notify every 10 games
    career_wins: 5      // Notify every 5 wins
};

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
                    weekLabel: g.weekLabel
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

            // Players active ONLY in this specific week (for determining who gets news items)
            const activePlayersInWeek = new Set(
                allGames.filter(g => g.season === week.season && g.weekIndex === week.weekIndex)
                        .map(g => g.player)
            );

            // Snapshots
            const snapCurrent = getSnapshot(gamesCurrent, week.season);
            const snapPrevious = getSnapshot(gamesPrevious, week.season);

            // Generate Stories
            const stories = generateStories(snapPrevious, snapCurrent, activePlayersInWeek);

            // Format Standings for JSON storage (lighter weight than full objects)
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

            reports.push({
                id: `${week.season}_${week.weekIndex}`,
                title: `Season ${week.season} - ${week.weekLabel}`,
                standings: formattedStandings,
                news: stories
            });
        });

        // Reverse so the dropdown shows latest first
        reports.reverse();

        // 4. Generate HTML
        generateHtmlDashboard(reports);
        
        console.log(`SUCCESS: Report generated at ${HTML_FILE}`);

    } catch (err) {
        console.error("Error processing data:", err);
    }
}

// ==========================================
// DATA SNAPSHOT ENGINE
// ==========================================

function getSnapshot(games, targetSeason) {
    // 1. Career Totals
    const careerMap = {};
    const streaksMap = {};

    const byPlayer = {};
    games.forEach(g => {
        if(!byPlayer[g.player]) byPlayer[g.player] = [];
        byPlayer[g.player].push(g);
    });

    Object.keys(byPlayer).forEach(player => {
        const records = byPlayer[player];
        const totalPoints = records.reduce((sum, r) => sum + r.points, 0);
        const wins = records.filter(r => r.place === 1).length;
        const totalGames = records.length;
        
        careerMap[player] = {
            points: totalPoints,
            wins: wins,
            games: totalGames
        };

        // Sort just in case
        records.sort((a, b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));
        
        streaksMap[player] = {
            winStreak: getActiveStreakCount(records, r => r.place === 1),
            topHalfStreak: getActiveStreakCount(records, r => r.place <= 2),
            noLastStreak: getActiveStreakCount(records, r => r.place !== 4)
        };
    });

    // 2. Season Standings (Target Season Only, Regular Season Only)
    const seasonGames = games.filter(g => g.season === targetSeason && !g.isPostSeason);
    const seasonMap = {};
    
    seasonGames.forEach(g => {
        if (!seasonMap[g.player]) {
            seasonMap[g.player] = { player: g.player, points: 0 };
        }
        seasonMap[g.player].points += g.points;
    });

    const standings = Object.values(seasonMap).sort((a,b) => b.points - a.points);
    const rankedStandings = [];
    let rank = 1;
    for(let i=0; i<standings.length; i++) {
        if (i > 0 && standings[i].points < standings[i-1].points) {
            rank = i + 1;
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
        rankLookup: rankLookup
    };
}

function getActiveStreakCount(records, predicate) {
    let count = 0;
    for (let i = records.length - 1; i >= 0; i--) {
        if (predicate(records[i])) count++;
        else break;
    }
    return count;
}

// ==========================================
// STORY GENERATOR
// ==========================================

function generateStories(prev, curr, activePlayers) {
    const stories = {
        milestones: [],
        rankChanges: [],
        streakEvents: [],
        seasonUpdates: []
    };

    activePlayers.forEach(player => {
        const pPrev = prev.career[player] || { points: 0, wins: 0, games: 0 };
        const pCurr = curr.career[player];
        
        const sPrev = prev.streaks[player] || { winStreak: 0, topHalfStreak: 0, noLastStreak: 0 };
        const sCurr = curr.streaks[player];

        const rPrev = prev.rankLookup[player];
        const rCurr = curr.rankLookup[player];

        // 1. CAREER MILESTONES
        if (pCurr) {
            checkMilestone(player, "Career Points", pPrev.points, pCurr.points, MILESTONES.career_points, stories.milestones);
            checkMilestone(player, "Career Games", pPrev.games, pCurr.games, MILESTONES.career_games, stories.milestones);
            checkMilestone(player, "Career Wins", pPrev.wins, pCurr.wins, MILESTONES.career_wins, stories.milestones);
        }

        // 2. SEASON RANK CHANGES
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
            } else {
                 stories.seasonUpdates.push({
                    player,
                    rank: rCurr.rank,
                    pointsAdded: rCurr.points - rPrev.points,
                    totalPoints: rCurr.points
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

        // 3. STREAKS
        if (sCurr && sPrev) {
            // Win Streaks
            if (sCurr.winStreak >= 2 && sCurr.winStreak > sPrev.winStreak) {
                stories.streakEvents.push({ player, type: 'Win Streak', count: sCurr.winStreak, status: 'Active' });
            } else if (sPrev.winStreak >= 2 && sCurr.winStreak === 0) {
                stories.streakEvents.push({ player, type: 'Win Streak', count: sPrev.winStreak, status: 'Snapped' });
            }

            // Top Half Streaks (Rank 1 or 2)
            if (sCurr.topHalfStreak >= 3 && sCurr.topHalfStreak > sPrev.topHalfStreak) {
                stories.streakEvents.push({ player, type: 'Top 2 Streak', count: sCurr.topHalfStreak, status: 'Active' });
            } else if (sPrev.topHalfStreak >= 3 && sCurr.topHalfStreak === 0) {
                stories.streakEvents.push({ player, type: 'Top 2 Streak', count: sPrev.topHalfStreak, status: 'Snapped' });
            }
            
            // No 4th Place Streak
            if (sCurr.noLastStreak >= 5 && sCurr.noLastStreak > sPrev.noLastStreak) {
                stories.streakEvents.push({ player, type: 'Safety Streak (No 4th)', count: sCurr.noLastStreak, status: 'Active' });
            } else if (sPrev.noLastStreak >= 5 && sCurr.noLastStreak === 0) {
                stories.streakEvents.push({ player, type: 'Safety Streak (No 4th)', count: sPrev.noLastStreak, status: 'Snapped' });
            }
        }
    });

    stories.rankChanges.sort((a,b) => b.diff - a.diff);
    return stories;
}

function checkMilestone(player, label, prevVal, currVal, interval, targetArray) {
    const prevBucket = Math.floor(prevVal / interval);
    const currBucket = Math.floor(currVal / interval);
    
    if (currBucket > prevBucket) {
        targetArray.push({
            player,
            milestone: currBucket * interval,
            label: label,
            value: currVal
        });
    }
}


// ==========================================
// HTML GENERATOR (UPDATED FOR INTERACTIVITY)
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
            --success: #22c55e;
            --danger: #ef4444;
            --warning: #eab308;
            --border: #e2e8f0;
        }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; }
        
        /* Header */
        header { text-align: center; margin-bottom: 30px; }
        h1 { margin: 0; color: var(--text); font-size: 1.8em; margin-bottom: 15px;}
        
        .selector-container { margin-bottom: 20px; }
        select { padding: 10px; font-size: 1em; border-radius: 6px; border: 1px solid var(--border); background: white; width: 100%; max-width: 300px; cursor: pointer; }

        /* Grid */
        .layout-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media(min-width: 768px) { .layout-grid { grid-template-columns: 2fr 3fr; } }

        /* Card Styles */
        .panel { background: var(--surface); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); height: fit-content; }
        .panel h2 { margin-top: 0; font-size: 1.2em; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 15px; }

        /* News Cards */
        .news-stack { display: flex; flex-direction: column; gap: 12px; }
        .news-card { display: flex; align-items: center; padding: 12px; border-radius: 8px; border-left: 4px solid #ccc; background: #f8fafc; animation: fadeIn 0.3s ease-in; }
        .card-icon { font-size: 1.5em; margin-right: 15px; width: 40px; text-align: center; }
        .card-content { flex: 1; }
        .card-title { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b; margin-bottom: 2px; }
        .card-text { font-size: 0.95em; line-height: 1.4; }
        .sub-text { display: block; font-size: 0.85em; color: #64748b; margin-top: 2px; }

        /* Card Types */
        .news-card.milestone { border-color: var(--warning); background: #fefce8; }
        .news-card.climb { border-color: var(--success); background: #f0fdf4; }
        .news-card.fall { border-color: var(--danger); background: #fef2f2; }
        .news-card.streak { border-color: #f97316; background: #fff7ed; }
        .news-card.snap { border-color: #64748b; background: #f1f5f9; opacity: 0.8; }

        /* Table */
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

        .empty-state { text-align: center; color: #94a3b8; padding: 20px; font-style: italic; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Weekly Delta Report</h1>
            <div class="selector-container">
                <select id="reportSelector" onchange="renderReport(this.value)">
                    <!-- Options populated by JS -->
                </select>
            </div>
        </header>

        <div class="layout-grid">
            <!-- Left Column: Standings -->
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
                <div id="standingsEmpty" style="display:none" class="empty-state">No standings data (Playoffs/Pre-season)</div>
            </div>

            <!-- Right Column: News Feed -->
            <div class="panel">
                <h2>Weekly Highlights</h2>
                <div class="news-stack" id="newsFeed">
                    <!-- Content -->
                </div>
            </div>
        </div>
    </div>

    <script>
        // EMBEDDED DATA
        const REPORTS = ${JSON.stringify(reports)};

        function init() {
            const select = document.getElementById('reportSelector');
            REPORTS.forEach((r, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.textContent = r.title;
                select.appendChild(opt);
            });
            
            // Render first report (latest)
            renderReport(0);
        }

        function renderReport(index) {
            const data = REPORTS[index];
            const tbody = document.getElementById('standingsBody');
            const newsFeed = document.getElementById('newsFeed');
            const stdEmpty = document.getElementById('standingsEmpty');
            const stdTable = document.getElementById('standingsTable');

            // 1. Render Standings
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
                    if (s.isNew) {
                        moveIcon = '<span class="new">NEW</span>';
                    } else if (s.diff > 0) {
                        moveIcon = '▲ ' + s.diff;
                        moveClass = 'positive';
                    } else if (s.diff < 0) {
                        moveIcon = '▼ ' + Math.abs(s.diff);
                        moveClass = 'negative';
                    }
                    
                    const isChamp = s.rank === 1 ? '👑' : '';
                    
                    const row = \`
                        <tr>
                            <td class="rank-col">\${s.rank}</td>
                            <td class="move-col \${moveClass}">\${moveIcon}</td>
                            <td class="player-col">\${s.player} \${isChamp}</td>
                            <td class="pts-col">\${s.points}</td>
                        </tr>
                    \`;
                    tbody.innerHTML += row;
                });
            }

            // 2. Render News
            let newsHtml = '';
            const news = data.news;
            
            // Milestones
            news.milestones.forEach(m => {
                newsHtml += createCard('milestone', '🏆', 'Historic Milestone', 
                    \`<strong>\${m.player}</strong> has crossed <strong>\${m.milestone}+</strong> \${m.label}! \`,
                    \`(Current Total: \${m.value})\`
                );
            });

            // Climbs
            news.rankChanges.filter(r => r.diff >= 2).forEach(r => {
                newsHtml += createCard('climb', '🚀', 'Big Mover', 
                    \`<strong>\${r.player}</strong> climbed <strong>\${r.diff}</strong> spots to rank #\${r.currRank}.\`
                );
            });

            // Falls
            news.rankChanges.filter(r => r.diff <= -2).forEach(r => {
                newsHtml += createCard('fall', '📉', 'Sliding Down', 
                    \`<strong>\${r.player}</strong> fell <strong>\${Math.abs(r.diff)}</strong> spots to rank #\${r.currRank}.\`
                );
            });

            // Streaks
            news.streakEvents.forEach(s => {
                if(s.status === 'Active') {
                    newsHtml += createCard('streak', '🔥', 'Heating Up', 
                        \`<strong>\${s.player}</strong> extends their \${s.type} to <strong>\${s.count}</strong> games.\`
                    );
                } else {
                    newsHtml += createCard('snap', '💔', 'Streak Snapped', 
                        \`<strong>\${s.player}</strong>'s streak of <strong>\${s.count}</strong> \${s.type}s has ended.\`
                    );
                }
            });

            if (newsHtml === '') {
                newsHtml = '<div class="empty-state">No major historic events or rank shifts this week. Keep playing!</div>';
            }
            
            newsFeed.innerHTML = newsHtml;
        }

        function createCard(type, icon, title, text, subtext = '') {
            return \`
                <div class="news-card \${type}">
                    <div class="card-icon">\${icon}</div>
                    <div class="card-content">
                        <div class="card-title">\${title}</div>
                        <div class="card-text">\${text}
                            \${subtext ? '<span class="sub-text">' + subtext + '</span>' : ''}
                        </div>
                    </div>
                </div>
            \`;
        }

        init();
    </script>
</body>
</html>
    `;
    fs.writeFileSync(HTML_FILE, htmlContent);
}

// ==========================================
// PARSING UTILITIES (From previous script)
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