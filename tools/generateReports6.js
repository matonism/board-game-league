const fs = require('fs');
const path = require('path');

// CONFIGURATION
const OUTPUT_DIR = path.join(__dirname, 'output');
const DATA_FILE = path.join(OUTPUT_DIR, 'Schedules.txt');
const CSV_FILE = path.join(OUTPUT_DIR, 'league_stats_export.csv');
const JSON_FILE = path.join(OUTPUT_DIR, 'league_stats_export.json');
const HTML_FILE = path.join(OUTPUT_DIR, 'league_stats_viewer.html');

// SCORING SYSTEM
const POINTS = { 1: 3, 2: 2, 3: 1, 4: 0 };

// GLOBAL ACCUMULATORS
const csvRows = ["Category,Subcategory,Scope,Rank,Player,Value,Context,IsActive"];
const jsonOutput = {
    metadata: {
        generated_at: new Date().toISOString(),
        description: "League Analytics Data"
    },
    leaderboards: []
};

/**
 * Main Execution Block
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

        // 1. Parse and Sort
        const allGames = parseSchedule(scheduleData);
        console.log(`Successfully parsed ${allGames.length} completed games.`);
        allGames.sort((a, b) => (a.season - b.season) || (a.weekIndex - b.weekIndex));

        // 2. Identify Active Players (Played in the most recent season)
        const maxSeason = Math.max(...allGames.map(g => g.season));
        const activePlayersSet = new Set(
            allGames.filter(g => g.season === maxSeason).map(g => g.player)
        );
        console.log(`Identified ${activePlayersSet.size} active players in season ${maxSeason}.`);

        // 3. Identify Seasons with Playoffs (Completed Seasons)
        // Used to determine if the "Current/Latest" season should be included in jump/drop stats
        const seasonsWithPlayoffs = new Set(
            allGames.filter(g => g.isPostSeason).map(g => g.season)
        );

        // 4. Identify Inaugural Season (for Rookie exclusions)
        const inauguralSeason = Math.min(...allGames.map(g => g.season));

        const regSeasonGames = allGames.filter(g => !g.isPostSeason);
        const postSeasonGames = allGames.filter(g => g.isPostSeason);

        console.log("\n========================================");
        console.log("       LEAGUE ANALYTICS REPORT");
        console.log("========================================");

        // --- SECTION 1: Aggregate Stats ---
        const SCOPE_REG = "All-Time (Regular Season)";
        const SCOPE_COM = "All-Time (Reg and Post Season)";

        [SCOPE_REG, SCOPE_COM].forEach(scope => {
            const dataset = scope === SCOPE_REG ? regSeasonGames : allGames;
            
            // 1. Averages
            processStat("Average Points per Game", "Averages", scope, getAveragePoints(dataset));

            // 2. Placement Rates - Min 5 Games
            const minGames = 5;
            processStat(`% of 1st Place Finishes (Min ${minGames} Games)`, "Placement Rates", scope, getPlacementRates(dataset, g => g.place === 1, minGames));
            processStat(`% of 2nd Place Finishes (Min ${minGames} Games)`, "Placement Rates", scope, getPlacementRates(dataset, g => g.place === 2, minGames));
            processStat(`% of 3rd Place Finishes (Min ${minGames} Games)`, "Placement Rates", scope, getPlacementRates(dataset, g => g.place === 3, minGames));
            processStat(`% of 4th Place Finishes (Min ${minGames} Games)`, "Placement Rates", scope, getPlacementRates(dataset, g => g.place === 4, minGames));
            processStat(`% of Top Half Finishes (Min ${minGames} Games)`, "Placement Rates", scope, getPlacementRates(dataset, g => g.place <= 2, minGames));
            processStat(`% of Bottom Half Finishes (Min ${minGames} Games)`, "Placement Rates", scope, getPlacementRates(dataset, g => g.place >= 3, minGames));

            // 3. Totals
            processStat("Points Leaders", "Totals", scope, getSums(dataset, 'points'));
            processStat("Most 1st Places", "Totals", scope, getCounts(dataset, g => g.place === 1));
            processStat("Most 2nd Places", "Totals", scope, getCounts(dataset, g => g.place === 2));
            processStat("Most 3rd Places", "Totals", scope, getCounts(dataset, g => g.place === 3));
            processStat("Most 4th Places", "Totals", scope, getCounts(dataset, g => g.place === 4));
            processStat("Top Half Finishes (1st/2nd)", "Totals", scope, getCounts(dataset, g => g.place <= 2));
            processStat("Bottom Half Finishes (3rd/4th)", "Totals", scope, getCounts(dataset, g => g.place >= 3));
            
            // 4. Streaks
            // Pass activePlayersSet to ensure retired players don't show as active
            processStat("Longest Win Streak", "Streaks", scope, getStreaks(dataset, g => g.place === 1, activePlayersSet));
            processStat("Current Active Win Streak", "Streaks", scope, getActiveStreaks(dataset, g => g.place === 1, activePlayersSet));
            
            processStat("Longest Streak w/o 4th", "Streaks", scope, getStreaks(dataset, g => g.place !== 4, activePlayersSet));
            processStat("Current Active Streak w/o 4th", "Streaks", scope, getActiveStreaks(dataset, g => g.place !== 4, activePlayersSet));
            
            processStat("Longest Top Half Streak (1st/2nd)", "Streaks", scope, getStreaks(dataset, g => g.place <= 2, activePlayersSet));
            processStat("Current Active Top Half Streak", "Streaks", scope, getActiveStreaks(dataset, g => g.place <= 2, activePlayersSet));

            processStat("Longest Winless Streak", "Streaks", scope, getStreaks(dataset, g => g.place !== 1, activePlayersSet));
            processStat("Current Active Winless Streak", "Streaks", scope, getActiveStreaks(dataset, g => g.place !== 1, activePlayersSet));
            
            processStat("Longest Bottom Half Streak (3rd/4th)", "Streaks", scope, getStreaks(dataset, g => g.place >= 3, activePlayersSet));
            processStat("Current Active Bottom Half Streak", "Streaks", scope, getActiveStreaks(dataset, g => g.place >= 3, activePlayersSet));

            // 5. Speed Records
            [10, 20, 30, 40, 50].forEach(target => {
                processStat(`Fastest to ${target} Career Points (# Games)`, "Speed Records", scope, getFastestToCareerPoints(dataset, target));
            });
        });

        // --- SECTION 2: Single Season Records ---
        const SCOPE_SEASON = "Single Season Records";
        const playerSeasons = getPlayerSeasonStats(regSeasonGames);

        processStat("Most Points (Season)", "Totals", SCOPE_SEASON, getRankedRecords(playerSeasons, 'points'));
        processStat("Most 1st Places", "Totals", SCOPE_SEASON, getRankedRecords(playerSeasons, 'place_1'));
        processStat("Most 2nd Places", "Totals", SCOPE_SEASON, getRankedRecords(playerSeasons, 'place_2'));
        processStat("Most 3rd Places", "Totals", SCOPE_SEASON, getRankedRecords(playerSeasons, 'place_3'));
        processStat("Most 4th Places", "Totals", SCOPE_SEASON, getRankedRecords(playerSeasons, 'place_4'));

        // For single season streaks, we still pass activePlayersSet to verify if the streak is CURRENTLY active in the league
        processStat("Longest Win Streak (Season)", "Streaks", SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place === 1, activePlayersSet));
        processStat("Longest Streak w/o 4th (Season)", "Streaks", SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place !== 4, activePlayersSet));
        processStat("Longest Top Half Streak (Season)", "Streaks", SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place <= 2, activePlayersSet));
        processStat("Longest Winless Streak (Season)", "Streaks", SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place !== 1, activePlayersSet));
        processStat("Longest Bottom Half Streak (Season)", "Streaks", SCOPE_SEASON, getSingleSeasonStreaks(regSeasonGames, g => g.place >= 3, activePlayersSet));

        // -- Rookie Records --
        const rookieRecords = getRookieSeasonRecords(regSeasonGames);
        processStat("Most Points in Rookie Season (All-Time)", "Rookie Records", SCOPE_SEASON, rookieRecords);
        
        const rookieRecordsExcl = rookieRecords.filter(r => r.season > inauguralSeason);
        processStat(`Most Points in Rookie Season (Excl. ${inauguralSeason})`, "Rookie Records", SCOPE_SEASON, rookieRecordsExcl);

        // -- Sophomore Records --
        const sophRecords = getSophomoreSeasonRecords(regSeasonGames);
        processStat("Best Sophomore Season (All-Time)", "Rookie Records", SCOPE_SEASON, sophRecords);

        const sophRecordsExcl = sophRecords.filter(r => r.rookieSeason > inauguralSeason); 
        processStat(`Best Sophomore Season (Excl. Class of ${inauguralSeason})`, "Rookie Records", SCOPE_SEASON, sophRecordsExcl);


        // --- SECTION 3: Post Season ---
        const SCOPE_POST = "Post Season Only";
        processStat("Most Playoff Appearances", "Totals", SCOPE_POST, getPlayoffAppearances(postSeasonGames));
        processStat("Most Championship Appearances", "Totals", SCOPE_POST, getChampionshipAppearances(postSeasonGames));
        processStat("Most Championship Titles", "Totals", SCOPE_POST, getChampionshipTitles(postSeasonGames));
        
        processStat("Most Consecutive Playoff Appearances", "Streaks", SCOPE_POST, getConsecutivePlayoffAppearances(postSeasonGames, activePlayersSet));

        // --- SECTION 4: Home Field Advantage ---
        const SCOPE_HOME = "Home Field Advantage";
        const homeDataset = allGames; 

        processStat("Average Points at Home (Min 5 Home Games)", "Averages", SCOPE_HOME, getLocationAveragePoints(homeDataset, true, 5));
        processStat("Average Points Away (Min 5 Away Games)", "Averages", SCOPE_HOME, getLocationAveragePoints(homeDataset, false, 5));

        processStat("Home Win % (Min 5 Home Games)", "Averages", SCOPE_HOME, getWinRates(homeDataset, true, 5));
        processStat("Away Win % (Min 5 Away Games)", "Averages", SCOPE_HOME, getWinRates(homeDataset, false, 5));
        
        processStat("% of Games Played at Home (Min 5 Games)", "Averages", SCOPE_HOME, getLocationPercent(homeDataset, true, 5));
        processStat("% of Games Played Away (Min 5 Games)", "Averages", SCOPE_HOME, getLocationPercent(homeDataset, false, 5));

        processStat("Most Home Games Played", "Totals", SCOPE_HOME, getCounts(homeDataset, g => g.isHome));
        processStat("Most Wins at Home", "Totals", SCOPE_HOME, getCounts(homeDataset, g => g.isHome && g.place === 1));
        processStat("Most Wins Away", "Totals", SCOPE_HOME, getCounts(homeDataset, g => !g.isHome && g.place === 1));
        
        processStat("Top Half Finishes at Home", "Totals", SCOPE_HOME, getCounts(homeDataset, g => g.isHome && g.place <= 2));
        processStat("Top Half Finishes Away", "Totals", SCOPE_HOME, getCounts(homeDataset, g => !g.isHome && g.place <= 2));

        // --- SECTION 5: Cross Season ---
        const SCOPE_CROSS = "Cross Season";
        const minRequiredGames = 2;
        for(let w=1; w<=6; w++) {
            processStat(`Best Week ${w} Performance Avg (Min ${minRequiredGames} games)`, "Averages by Week", SCOPE_CROSS, getWeeklyAverages(allGames, w, minRequiredGames));
        }

        // Risers and Fallers
        processStat("Biggest Points Jump (Season to Season)", "Risers and Fallers", SCOPE_CROSS, getBiggestPointJumps(regSeasonGames, seasonsWithPlayoffs));
        processStat("Biggest Points Drop (Season to Season)", "Risers and Fallers", SCOPE_CROSS, getBiggestPointDrops(regSeasonGames, seasonsWithPlayoffs));
        
        // Consistency (Standard Deviation of Placement) - Min 5 games
        processStat("Most Consistent Finishers (Game Finishes Std Dev)", "Risers and Fallers", SCOPE_CROSS, getPlacementConsistency(regSeasonGames, 5));
        
        // NEW: Consistency (Standard Deviation of Season Point Totals) - Min 3 seasons
        processStat("Most Consistent Scorers (Season Pts Std Dev)", "Risers and Fallers", SCOPE_CROSS, getPointsConsistency(regSeasonGames, 3));


        // --- SECTION 6: League Metrics ---
        const SCOPE_METRICS = "League Metrics";
        const seasonMetrics = calculateSeasonMetrics(allGames);
        
        processStat("Lowest Points to Qualify for Playoffs", "Cutoffs", SCOPE_METRICS, seasonMetrics.lowestQualifiers);
        
        processStat("Worst Start (2 Games) to Make Playoffs", "Comebacks", SCOPE_METRICS, seasonMetrics.worstStarts2);
        processStat("Worst Start (3 Games) to Make Playoffs", "Comebacks", SCOPE_METRICS, seasonMetrics.worstStarts3);
        processStat("Worst Start (4 Games) to Make Playoffs", "Comebacks", SCOPE_METRICS, seasonMetrics.worstStarts4);
        
        processStat("Best Start (2 Games) to Miss Playoffs", "Collapses", SCOPE_METRICS, seasonMetrics.bestMisses2);
        processStat("Best Start (3 Games) to Miss Playoffs", "Collapses", SCOPE_METRICS, seasonMetrics.bestMisses3);
        processStat("Best Start (4 Games) to Miss Playoffs", "Collapses", SCOPE_METRICS, seasonMetrics.bestMisses4);


        // 3. Write Outputs
        fs.writeFileSync(CSV_FILE, csvRows.join('\n'));
        console.log(`SUCCESS: CSV exported to ${CSV_FILE}`);

        fs.writeFileSync(JSON_FILE, JSON.stringify(jsonOutput, null, 2));
        console.log(`SUCCESS: JSON exported to ${JSON_FILE}`);

        // 4. GENERATE HTML DASHBOARD
        generateHtmlDashboard(jsonOutput);
        console.log(`SUCCESS: HTML Dashboard exported to ${HTML_FILE}`);

    } catch (err) {
        console.error("Error processing data:", err);
    }
}

// =============================================
// HTML GENERATOR
// =============================================

function generateHtmlDashboard(data) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>League Analytics Dashboard</title>
    <style>
        :root { --primary: #2563eb; --bg: #f8fafc; --surface: #ffffff; --text: #1e293b; --border: #e2e8f0; --active-streak: #16a34a; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        header { margin-bottom: 30px; text-align: center; }
        h1 { margin: 0; color: var(--primary); }
        .timestamp { color: #64748b; font-size: 0.9em; }
        
        /* Tabs */
        .tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; }
        .tab-btn { padding: 10px 20px; border: none; background: var(--surface); cursor: pointer; border-radius: 8px; font-weight: 600; color: #64748b; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s; }
        .tab-btn.active { background: var(--primary); color: white; }
        .tab-btn:hover:not(.active) { background: #e0f2fe; color: var(--primary); }

        /* Content */
        .tab-content { display: none; }
        .tab-content.active { display: block; animation: fadeIn 0.3s; }
        
        /* Sub Navigation */
        .sub-nav { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 25px; border-bottom: 1px solid var(--border); padding-bottom: 15px; }
        .sub-nav-btn { font-size: 0.85em; padding: 6px 12px; background: #eff6ff; color: var(--primary); border: 1px solid #bfdbfe; border-radius: 20px; cursor: pointer; text-decoration: none; font-weight: 600; transition: background 0.2s; }
        .sub-nav-btn:hover { background: #dbeafe; }

        /* Subcategories */
        .subcat-header { color: #64748b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; font-size: 1.2em; text-transform: uppercase; letter-spacing: 0.05em; scroll-margin-top: 20px; }
        .subcat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }

        /* Cards */
        .card { background: var(--surface); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid var(--border); display: flex; flex-direction: column; }
        .card h3 { margin-top: 0; color: var(--primary); font-size: 1.1em; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px; }
        
        /* Table */
        table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
        th { text-align: left; color: #64748b; font-weight: 600; padding-bottom: 8px; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        tr:last-child td { border-bottom: none; }
        .rank-col { width: 40px; font-weight: bold; color: #94a3b8; }
        .val-col { text-align: right; font-weight: 700; color: var(--text); }
        .ctx-col { font-size: 0.85em; color: #64748b; text-align: right; padding-left: 10px; }
        .active-badge { color: var(--active-streak); font-weight: bold; font-size: 0.9em; margin-left: 5px; }
        
        /* Hidden Rows */
        .hidden-rows { display: none; }
        .show-more-btn { margin-top: auto; padding-top: 15px; background: none; border: none; color: var(--primary); cursor: pointer; font-size: 0.9em; font-weight: 600; width: 100%; text-align: center; }
        .show-more-btn:hover { text-decoration: underline; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>League Analytics Dashboard</h1>
            <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
        </header>

        <div class="tabs" id="tabContainer"></div>
        <div id="contentContainer"></div>
    </div>

    <script>
        // EMBEDDED DATA
        const LEAGUE_DATA = ${JSON.stringify(data)};

        function init() {
            const tabsContainer = document.getElementById('tabContainer');
            const contentContainer = document.getElementById('contentContainer');
            
            // 1. Group Data by Scope
            const scopes = {};
            LEAGUE_DATA.leaderboards.forEach(lb => {
                if (!scopes[lb.scope]) scopes[lb.scope] = [];
                scopes[lb.scope].push(lb);
            });

            // 2. Create Tabs and Content
            let isFirst = true;
            for (const [scopeName, boards] of Object.entries(scopes)) {
                // Button
                const btn = document.createElement('button');
                btn.className = \`tab-btn \${isFirst ? 'active' : ''}\`;
                btn.textContent = scopeName;
                btn.onclick = () => switchTab(scopeName);
                tabsContainer.appendChild(btn);

                // Content Wrapper
                const wrapper = document.createElement('div');
                wrapper.id = 'scope-' + scopeName.replace(/[^a-zA-Z0-9]/g, '');
                wrapper.className = \`tab-content \${isFirst ? 'active' : ''}\`;
                
                // Group by Subcategory
                const subcats = {};
                boards.forEach(b => {
                    if (!subcats[b.subcategory]) subcats[b.subcategory] = [];
                    subcats[b.subcategory].push(b);
                });

                // Create Quick Navigation Bar
                const navBar = document.createElement('div');
                navBar.className = 'sub-nav';
                navBar.innerHTML = '<span style="font-size:0.8em; color:#64748b; align-self:center; margin-right:5px;">JUMP TO:</span>';
                
                Object.keys(subcats).forEach(subName => {
                    const navBtn = document.createElement('button');
                    navBtn.className = 'sub-nav-btn';
                    navBtn.textContent = subName;
                    navBtn.onclick = () => {
                        const targetId = 'header-' + scopeName.replace(/[^a-zA-Z0-9]/g, '') + '-' + subName.replace(/[^a-zA-Z0-9]/g, '');
                        const el = document.getElementById(targetId);
                        if(el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
                    };
                    navBar.appendChild(navBtn);
                });
                wrapper.appendChild(navBar);

                // Render Subcategories
                for (const [subName, subBoards] of Object.entries(subcats)) {
                     const header = document.createElement('h2');
                     header.textContent = subName;
                     header.className = 'subcat-header';
                     // Add ID for navigation
                     header.id = 'header-' + scopeName.replace(/[^a-zA-Z0-9]/g, '') + '-' + subName.replace(/[^a-zA-Z0-9]/g, '');
                     wrapper.appendChild(header);

                     const grid = document.createElement('div');
                     grid.className = 'subcat-grid';
                     subBoards.forEach(board => {
                        grid.appendChild(createCard(board));
                     });
                     wrapper.appendChild(grid);
                }

                contentContainer.appendChild(wrapper);
                isFirst = false;
            }
        }

        function createCard(board) {
            const card = document.createElement('div');
            card.className = 'card';
            
            let rowsHtml = '';
            const limit = 5;
            const hasHidden = board.entries.length > limit;

            board.entries.forEach((entry, index) => {
                const hiddenClass = index >= limit ? 'hidden-rows' : '';
                const activeHtml = entry.isActive ? '<span class="active-badge" title="Active Streak">🔥 Active</span>' : '';
                
                rowsHtml += \`
                    <tr class="\${hiddenClass}">
                        <td class="rank-col">#\${entry.rank}</td>
                        <td class="player-col">\${entry.player}</td>
                        <td class="val-col">\${entry.value}</td>
                        <td class="ctx-col">\${entry.context}\${activeHtml}</td>
                    </tr>
                \`;
            });

            let btnHtml = '';
            if (hasHidden) {
                btnHtml = \`<button class="show-more-btn" onclick="toggleRows(this)">Show Full Leaderboard (\${board.entries.length})</button>\`;
            }

            card.innerHTML = \`
                <h3>\${board.category}</h3>
                <table>
                    <thead><tr><th>Rank</th><th>Player</th><th style="text-align:right">Value</th><th></th></tr></thead>
                    <tbody>\${rowsHtml}</tbody>
                </table>
                \${btnHtml}
            \`;
            return card;
        }

        function switchTab(scopeName) {
            // Buttons
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.toggle('active', b.textContent === scopeName);
            });
            // Content
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.remove('active');
            });
            const targetId = 'scope-' + scopeName.replace(/[^a-zA-Z0-9]/g, '');
            document.getElementById(targetId).classList.add('active');
        }

        function toggleRows(btn) {
            const table = btn.previousElementSibling;
            const hiddenRows = table.querySelectorAll('.hidden-rows');
            const isExpanding = btn.textContent.includes('Show'); // Simple check
            
            hiddenRows.forEach(row => {
                row.style.display = isExpanding ? 'table-row' : 'none';
            });

            btn.textContent = isExpanding ? 'Collapse' : 'Show Full Leaderboard';
        }

        init();
    </script>
</body>
</html>
    `;
    fs.writeFileSync(HTML_FILE, htmlContent);
}

// =============================================
// OUTPUT & FORMATTING LOGIC
// =============================================

function processStat(category, subcategory, scope, sortedList) {
    if (!sortedList || sortedList.length === 0) return;

    // 1. Console Output
    console.log(`\n> ${category} [${scope}]`);
    let rank = 1;
    for (let i = 0; i < sortedList.length; i++) {
        const current = sortedList[i];
        const prev = i > 0 ? sortedList[i-1] : null;
        if (prev && prev.value !== current.value) rank = i + 1;
        
        const extra = current.extra ? current.extra : '';
        const activeMark = current.isActive ? " [ACTIVE]" : "";
        
        // Only print Top 5 to console to keep it clean
        if (i < 5) console.log(`  ${rank}. ${current.player.padEnd(15)}: ${current.value} ${extra}${activeMark}`);
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

function parseSchedule(data) {
    const games = [];
    for (const [seasonStr, weeks] of Object.entries(data)) {
        const season = parseInt(seasonStr);
        weeks.forEach(weekData => {
            const weekLabel = weekData.week;
            const weekIndex = getWeekSortIndex(weekLabel);
            // Updated regex to catch "Championship" as a post-season game
            const isPostSeason = weekLabel.includes('Playoff') || weekLabel.includes('Championship');
            if (weekData.results) {
                weekData.results.forEach(table => {
                    const location = table.location;
                    if (table.players) {
                        table.players.forEach(p => {
                            if (p.placement) {
                                const place = parseInt(p.placement);
                                games.push({
                                    season: season,
                                    weekLabel: weekLabel,
                                    weekIndex: weekIndex,
                                    isPostSeason: isPostSeason,
                                    gameName: weekData.game,
                                    player: p.player,
                                    place: place,
                                    points: POINTS[place] || 0,
                                    isHome: location.includes(p.player)
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

function getCounts(games, filterFn) {
    const grouped = groupByPlayer(games);
    const results = [];
    for (const [player, records] of Object.entries(grouped)) {
        const count = records.filter(filterFn).length;
        results.push({ player, value: count });
    }
    return results.sort((a, b) => b.value - a.value);
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
        
        results.push({ player, value: max, isActive: isActive, extra: context });
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

            // Context is already generated by getStreaks, but we want to ensure season year is visible if not present?
            // getStreaks returns (Date - Date). Since this is Single Season, adding (Season) is redundant if dates have years.
            // Let's rely on the formatted date string from getStreaks.

            if (r.value > 0) results.push({ player: r.player, value: r.value, extra: r.extra, isActive: finalActive });
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
function getBiggestPointJumps(games, seasonsWithPlayoffs) {
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
                // Only include if playoffs have started for this season
                // If seasonsWithPlayoffs is provided and doesn't contain currentYear, skip
                if (seasonsWithPlayoffs && !seasonsWithPlayoffs.has(currentYear)) {
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
function getBiggestPointDrops(games, seasonsWithPlayoffs) {
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
                // Only include if playoffs have started for this season
                // If seasonsWithPlayoffs is provided and doesn't contain currentYear, skip
                if (seasonsWithPlayoffs && !seasonsWithPlayoffs.has(currentYear)) {
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

// NEW: League Metrics Calculation
function calculateSeasonMetrics(allGames) {
    const regGames = allGames.filter(g => !g.isPostSeason);
    const seasons = {};
    
    // Group reg season data
    regGames.forEach(g => {
        if (!seasons[g.season]) seasons[g.season] = { players: {}, playoffQualifiers: new Set(), hasPlayoffs: false };
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

    // Determine who made playoffs each year AND if the season has had playoffs
    allGames.filter(g => g.isPostSeason).forEach(g => {
        if (seasons[g.season]) {
            seasons[g.season].playoffQualifiers.add(g.player);
            seasons[g.season].hasPlayoffs = true; // Mark season as having playoffs
        }
    });

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
        // SKIP current/ongoing seasons that haven't had playoffs yet
        if (!data.hasPlayoffs) continue;

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

main();