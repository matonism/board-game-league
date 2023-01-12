export function createScheduleObject(response) {
    let numberOfGamesPerWeek = getNumberOfGamesPerWeek(response);
    let numberOfPlayersPerGame = 4;
    let infoHeaderRows = 1;
    let rowsBetweenWeeksInSpreadsheet = numberOfGamesPerWeek * 2 + infoHeaderRows;
    
    let schedule = [];
    response.values.forEach((row, rowIndex) => {
        
        let rowReference = rowIndex % rowsBetweenWeeksInSpreadsheet;
        if(rowReference == 0){
            schedule.push({
                week: row[0], 
                game: row[1], 
                dates: row[2], 
                results: []});
        }else if(rowReference % 2 === 1){
            let placementRow = response.values[rowIndex + 1];
            let scheduleToUpdate = schedule[schedule.length - 1];
            scheduleToUpdate.results.push([]);
            for(let j = 1; j <= numberOfPlayersPerGame; j++){
                let groupToUpdate = scheduleToUpdate.results[scheduleToUpdate.results.length-1];
                let placement = placementRow[j];
                groupToUpdate.push({player: row[j], placement: placement})
            }
        }
    });

    return schedule;
}

function getNumberOfGamesPerWeek(scheduleResponse){
    let numberOfRowsBetweenWeeks = 0;
    if(scheduleResponse.values.length > 1){
        for(let i = 1; i < scheduleResponse.values.length; i++){
            let row = scheduleResponse.values[i];
            if(row[0].toLowerCase().includes('week')){
                break;
            }else{
                numberOfRowsBetweenWeeks++
            }
        }
    }
    return numberOfRowsBetweenWeeks/2;
}

export function createStandingsObject(schedule){
    let standings = {};
    schedule.forEach(week=>{
        week.results.forEach(group => {
            group.forEach(performance => {
                if(!standings[performance.player]){
                    standings[performance.player] = 0;
                }
                if(performance.placement){
                    standings[performance.player] += scoringRubric(performance.placement);
                }
            })
        })
    })
    
    let standingsArray = Object.keys(standings).map(player => {
        return {player: player, points: standings[player]};
    })


    standingsArray.sort((a, b) => {
        if(a.points > b.points) {
            return -1;
        }else{
            return 1;
        }
    })

    return standingsArray;
}

function scoringRubric(placement){
 if(placement == 1){
     return 3;
 }else if(placement == 2){
     return 2;
 }else if(placement == 3){
     return 1;
 }
 return 0;
}