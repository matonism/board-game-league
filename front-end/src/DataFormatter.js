import {getBoardGameGeekIds } from "./callouts/CalloutFactory";


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
                        standings.regularSeason[performance.player] = {score: 0, gamesPlayed: 0, gamesToPlay: 0};
                    }
                    if(performance.placement){
                        standings.regularSeason[performance.player].score += scoringRubric(performance.placement);
                        standings.regularSeason[performance.player].gamesPlayed++;
                    }
                    standings.regularSeason[performance.player].gamesToPlay++;
                })
            })
        }else{
            week.results.forEach(group => {
                group.forEach(performance => {
                    if(!standings.championship[performance.player]){
                        standings.championship[performance.player] = {score: 0, gamesPlayed: 0, gamesToPlay: 0};
                    }
                    if(performance.placement){
                        standings.championship[performance.player].score += scoringRubric(performance.placement);
                        standings.championship[performance.player].gamesPlayed++;
                    }
                    standings.championship[performance.player].gamesToPlay++;
                })
            })
        }
       
    })
    
    //regular season sorting
    let standingsArray = Object.keys(standings.regularSeason).map(player => {
        let gamesPlayed = standings.regularSeason[player].gamesPlayed;
        let score = standings.regularSeason[player].score;
        let gamesToPlay = standings.regularSeason[player].gamesToPlay;
        // let strengthOfSchedule = gamesPlayed > 0 ? score / gamesPlayed : 0;
        return {player: player, points: score, gamesPlayed: gamesPlayed, gamesToPlay: gamesToPlay};
    })
    standingsArray.sort((a, b) => {
        if(a.points > b.points) {
            return -1;
        }else{
            return 1;
        }
    })

    let mostRecentPlacement = 1;
    standingsArray.forEach((person, index) => {
        if(index === 0 || person.points !== standingsArray[index - 1].points){
            person.placement = index + 1;
            mostRecentPlacement = index + 1;
        }else{
            person.placement = mostRecentPlacement;
        }
    })

    //championship sorting
    let championshipArray = Object.keys(standings.championship).map(player => {
        let gamesPlayed = standings.championship[player].gamesPlayed;
        let score = standings.championship[player].score;
        let gamesToPlay = standings.championship[player].gamesToPlay;

        return {player: player, points: score, gamesPlayed: gamesPlayed, gamesToPlay: gamesToPlay};
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

export function createStrengthOfScheduleObject(schedule, standings){

    let gamesPerWeek = 4;
    let sosObject = {};
    schedule.forEach(week=>{
        if(week.week.toLowerCase() !== 'championship'){ 
            week.results.forEach(group => {
                gamesPerWeek = group.length;
                group.forEach(performance => {

                    if(!sosObject[performance.player]){
                        let player = standings.regularSeason.find(standing => { return standing.player === performance.player})
                        sosObject[performance.player] = {strengthOfScheduleTotal: 0, gamesPlayed: player.gamesPlayed, gamesToPlay: player.gamesToPlay};
                    }
                    group.forEach(performance2 => {
                        if(performance != performance2){
                            let performance2Player = standings.regularSeason.find(standing => { return standing.player === performance2.player})
                            let sosValue = performance2Player.gamesPlayed > 0 ? performance2Player.points / performance2Player.gamesPlayed : 0;
                            if(performance.player === 'Jack'){
                                console.log(sosValue);
                            }
                            sosObject[performance.player].strengthOfScheduleTotal += sosValue;
                        }
                    })
                    
                })
            })
        }
    })

    Object.keys(sosObject).forEach(player => {
        sosObject[player].strengthOfSchedule = sosObject[player].strengthOfScheduleTotal / sosObject[player].gamesToPlay / 3;
    });

    let sosArray = Object.keys(sosObject).map(sosKey => {
        let sos = sosObject[sosKey];
        return {player: sosKey, strengthOfSchedule: sos.strengthOfSchedule};
    })
    
    sosArray.sort((a, b) => {
        if(a.strengthOfSchedule > b.strengthOfSchedule) {
            return -1;
        }else{
            return 1;
        }
    })
    
    let mostRecentPlacement = 1;
    sosArray.forEach((person, index) => {
        if(index === 0 || person.strengthOfSchedule !== sosArray[index - 1].strengthOfSchedule){
            person.placement = index + 1;
            mostRecentPlacement = index + 1;
        }else{
            person.placement = mostRecentPlacement;
        }
    })
    return sosArray;
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
                    if(powerRankingsResponse.values[rowIndex + 1].length > columnIndex){
                        powerRankings.push({
                            label: value,
                            rankings: []
                        })
                    }
                }else{
                    powerRankings[columnIndex].rankings.push(value);
                }
            })
        })
    }
    return powerRankings;
}

export async function createBoardGameHyperlinkMap(schedule){
    let gameNameQueryString = '';
    schedule.forEach(week=>{
        if(week.game && week.game != 'TBD'){
            gameNameQueryString += week.game + ',';
        }    
    })

    try{
        let response = await getBoardGameGeekIds(gameNameQueryString.replaceAll(' ', '+'))
        console.log(response);
        return response;
    }catch(error){
        console.log('search failed...');
        console.log(error);
    }
    
}