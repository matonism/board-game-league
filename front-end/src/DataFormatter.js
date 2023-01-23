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
                results: [],
                album: []
            });
        }else if(rowReference % 2 === 1){
            let placementRow = response.values[rowIndex + 1];
            let scheduleToUpdate = schedule[schedule.length - 1];
            scheduleToUpdate.results.push([]);
            for(let j = 1; j <= numberOfPlayersPerGame; j++){
                let groupToUpdate = scheduleToUpdate.results[scheduleToUpdate.results.length-1];
                let placement = placementRow[j];
                groupToUpdate.push({player: row[j], placement: placement})
            }

            if(scheduleToUpdate.results[0][0]?.placement){
                
                if(scheduleToUpdate.week === 'championship'){
                    scheduleToUpdate.album.push('championship')
                }else{
                    scheduleToUpdate.album.push(schedule.length + '_' + scheduleToUpdate.results.length)
                }
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
    let standings = {
        regularSeason: {},
        championship: {}
    };
    schedule.forEach(week=>{
        if(week.week.toLowerCase() !== 'championship'){ 
            week.results.forEach(group => {
                group.forEach(performance => {
                    if(!standings.regularSeason[performance.player]){
                        standings.regularSeason[performance.player] = 0;
                    }
                    if(performance.placement){
                        standings.regularSeason[performance.player] += scoringRubric(performance.placement);
                    }
                })
            })
        }else{
            week.results.forEach(group => {
                group.forEach(performance => {
                    if(!standings.championship[performance.player]){
                        standings.championship[performance.player] = 0;
                    }
                    if(performance.placement){
                        standings.championship[performance.player] += scoringRubric(performance.placement);
                    }
                })
            })
        }
       
    })
    
    //regular season sorting
    let standingsArray = Object.keys(standings.regularSeason).map(player => {
        return {player: player, points: standings.regularSeason[player]};
    })
    standingsArray.sort((a, b) => {
        if(a.points > b.points) {
            return -1;
        }else{
            return 1;
        }
    })

    //championship sorting
    let championshipArray = Object.keys(standings.championship).map(player => {
        return {player: player, points: standings.championship[player]};
    })
    championshipArray.sort((a, b) => {
        if(a.points > b.points) {
            return -1;
        }else{
            return 1;
        }
    })

    standings.regularSeason = standingsArray;
    standings.championship = championshipArray;
    return standings;
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

export function getImageFileNamesToLoad(schedule, response){
    let mostPossibleImages = 0;
    let championshipPlayed = false;
    schedule.forEach(week=>{
        if(week.week.toLowerCase() !== 'championship'){ 
            week.results.forEach(group => {
                let performance = group[0];
                if(performance?.placement){
                    mostPossibleImages++;
                }
            })
        }else{
            week.results.forEach(group => {
                let performance = group[0];
                if(performance?.placement){
                    championshipPlayed = true;
                }
            })
        }
    });

    let numberOfGamesPerWeek = getNumberOfGamesPerWeek(response);

    let imageNames= [];
    let week = 1;
    for(let i = 0; i < mostPossibleImages; i++){
        let imageName = null;
        if(championshipPlayed && i === mostPossibleImages-1){
            imageName = 'championship';
        }else{
            let imageNumberForWeek = (i % numberOfGamesPerWeek) + 1;
            imageName = week + '_' + imageNumberForWeek;
            if(imageNumberForWeek === numberOfGamesPerWeek-1){
                week++;
            }
        }

        if(imageNames.length < week){
            imageNames[week-1] = [];
        }
        imageNames[week-1].push(imageName);
    }

    return imageNames
    
}

export function getPowerRankingsObjects(powerRankingsResponse){
    let powerRankings = [];
    if(powerRankingsResponse.values.length > 1){

        powerRankingsResponse.values.forEach((row, rowIndex) => {
            row.forEach((value, columnIndex)=>{
                if(rowIndex === 0){
                    powerRankings.push({
                        label: value,
                        rankings: []
                    })
                }else{
                    powerRankings[columnIndex].rankings.push(value);
                }
            })
        })
    }
    return powerRankings;
}