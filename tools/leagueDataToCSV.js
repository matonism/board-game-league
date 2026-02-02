const fs = require('fs');

/**
 * Converts nested game schedule JSON into a flat CSV format.
 * Includes "Home" logic: true if Player Name is found within the Location string.
 */
function convertScheduleToCSV(scheduleData) {
    const headers = ["Player Name", "Season", "Week", "Game", "Group Number", "Placement", "Home", "Location"];
    const rows = [headers.join(",")];

    Object.keys(scheduleData).forEach(year => {
        const weeks = scheduleData[year];

        weeks.forEach(weekData => {
            const week = weekData.week;
            const gameName = weekData.game;

            weekData.results.forEach((result, groupIndex) => {
                const location = result.location || "";
                const groupNumber = groupIndex + 1;

                result.players.forEach(p => {
                    const playerName = p.player;
                    
                    // Home Logic: Check if the player name is mentioned in the location string
                    // We use .toLowerCase() to ensure the match isn't case-sensitive
                    const isHome = location.toLowerCase().includes(playerName.toLowerCase());

                    // CSV safety formatting
                    const cleanLocation = `"${location.replace(/"/g, '""')}"`;
                    const cleanGame = `"${gameName.replace(/"/g, '""')}"`;

                    const row = [
                        playerName,
                        year,
                        week,
                        cleanGame,
                        groupNumber,
                        p.placement || "", // Handles TBD placements 
                        isHome ? "true" : "false",
                        cleanLocation
                    ];

                    rows.push(row.join(","));
                });
            });
        });
    });

    return rows.join("\n");
}

try {
    const rawData = fs.readFileSync('./output/Schedules.txt', 'utf8');
    const scheduleData = JSON.parse(rawData);
    const csvContent = convertScheduleToCSV(scheduleData);

    fs.writeFileSync('./analysis/BoardGameInsights_HomeLogic.csv', csvContent);
    console.log("Success! Created 'BoardGameInsights_HomeLogic.csv' with automated Home detection.");
} catch (error) {
    console.error("Error processing schedule:", error.message);
}