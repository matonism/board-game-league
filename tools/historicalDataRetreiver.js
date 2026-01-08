const getSchedule = require('./callouts/getSchedule.js');
const getHistoricalData = require('./callouts/getHistoricalData.js');
const DataFormatter = require('./utilities/DataFormatter.js');
const fileWriter = require("./utilities/fileWriter.js");
const getBoardGameInfo = require("./callouts/getBoardGameInfo.js");

const currentSeason = "2026";
const fileType = "txt";
const currentWeek = 1;
const groupsFinished = 1;

const fileKey = currentSeason + '_' + currentWeek + '_' + groupsFinished;


method();

async function method(){
    try{
        let scheduleData = await getSchedule({season:"2026"});
        let scheduleObject = DataFormatter.createScheduleObject(scheduleData);
        // console.log(scheduleObject);
        let data = await getHistoricalData({seasons:"2022,2023,2024,2025,2026"});
        let formattedData = DataFormatter.createHistoricalDataObject(data);
        // fileWriter.createFile('output/', 'HistoricalDataRegularSeason' + fileKey, fileType, JSON.stringify(formattedData.regularSeason));
        // fileWriter.createFile('output/', 'historicalDataPostSeason' + fileKey, fileType, JSON.stringify(formattedData.postSeason));
        // fileWriter.createFile('output/', 'Schedules' + fileKey, fileType, JSON.stringify(formattedData.schedules));

        // let standings = {};
        // let strengthOfSchedule = {};
        // for(let year = 2022; year <= currentSeason; year++){
        //     standings[year] = DataFormatter.createStandingsObject(formattedData.schedules[year]);
        //     strengthOfSchedule[year] = DataFormatter.createStrengthOfScheduleObject(formattedData.schedules[year], standings[year]);
        // }
        
        // fileWriter.createFile('output/', "Standings" + fileKey, fileType, JSON.stringify(standings));
        // fileWriter.createFile('output/', "StrengthOfSchedules" + fileKey, fileType, JSON.stringify(strengthOfSchedule));

        // let allGames = DataFormatter.getAllGames(formattedData.schedules);
        // let gameSummaries = await getBoardGameInfo({games: allGames});
        let gameSummaries = await getBoardGameInfo({games: 'Harvest'});
        fileWriter.createFile('output/', "GameSummariesHarvest", 'json', JSON.stringify(gameSummaries));

        console.log('success');
    }catch(error){
        console.log('error');
        console.log(error);
    }
}