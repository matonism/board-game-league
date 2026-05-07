
const getBoardGameInfo = require("./callouts/getBoardGameInfo.js");

method();

async function method(){
    try{

        // let allGames = DataFormatter.getAllGames(formattedData.schedules);
        // let gameSummaries = await getBoardGameInfo({games: allGames});
        let gameSummaries = await getBoardGameInfo({games: 'Wyrmspan'});
        console.log(gameSummaries);
        // fileWriter.createFile('output/', "GameSummariesWroth", 'json', JSON.stringify(gameSummaries));

        console.log('success');
    }catch(error){
        console.log('error');
        console.log(error);
    }
}