import {getBoardGameGeekIds } from "./callouts/CalloutFactory";


export function createScheduleObject(response) {
    if(response?.values?.length > 0 && response.values[0].length === 5){
        return null;
    }
    let numberOfGamesPerWeek = getNumberOfGamesPerWeek(response);
    let numberOfPlayersPerGame = 4;
    let infoHeaderRows = 1;
    let rowsBetweenWeeksInSpreadsheet = numberOfGamesPerWeek * 2 + infoHeaderRows;
    
    let schedule = [];
    let playoffRowStart = 0;

    for(let rowIndex = 0; rowIndex < response.values.length; rowIndex++){

        let row = response.values[rowIndex];
        let rowReference = rowIndex % rowsBetweenWeeksInSpreadsheet;
        if(rowReference === 0){

            if(row[0].toLowerCase().includes('championship') || row[0].toLowerCase().includes('playoff')){
                playoffRowStart = rowIndex;
                break;
            }

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
            // scheduleToUpdate.results.push([]);
            let newGroup = [];
            for(let j = 1; j <= numberOfPlayersPerGame; j++){
                if(row[j]){
                    let placement = placementRow[j];
                    newGroup.push({player: row[j].trim(), placement: placement})
                }
                // let groupToUpdate = scheduleToUpdate.results[scheduleToUpdate.results.length-1];
            }
            if(newGroup.length > 0){
                scheduleToUpdate.results.push(newGroup);
            }

            //For album, we need to match the naming convention (ex: 2_3) to the given week (2) and given group (3)
            if(scheduleToUpdate.results?.length > 0 && scheduleToUpdate.results[scheduleToUpdate.results.length-1][0]?.placement){
                
                if(scheduleToUpdate.week === 'championship'){
                    scheduleToUpdate.album.push('championship')
                }else{
                    scheduleToUpdate.album.push(schedule.length + '_' + scheduleToUpdate.results.length)
                }
            }
        }
    }

    //Playoffs and championship setup
    let rowsBetweenChampionshipWeeks = 1 * 2 + infoHeaderRows;
    for(let rowIndex = playoffRowStart; rowIndex < response.values.length; rowIndex++){
        let row = response.values[rowIndex];
        let rowReference = rowIndex % rowsBetweenChampionshipWeeks;
        if(rowReference === 0){
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
            // scheduleToUpdate.results.push([]);
            let newGroup = [];
            for(let j = 1; j <= numberOfPlayersPerGame; j++){
                if(row[j]){
                    let placement = placementRow[j];
                    newGroup.push({player: row[j].trim(), placement: placement})
                }
                // let groupToUpdate = scheduleToUpdate.results[scheduleToUpdate.results.length-1];
            }
            if(newGroup.length > 0){
                scheduleToUpdate.results.push(newGroup);
            }

            //For album, we need to match the naming convention (ex: 2_3) to the given week (2) and given group (3)
            if(scheduleToUpdate.results?.length > 0 && scheduleToUpdate.results[scheduleToUpdate.results.length-1][0]?.placement){
                
                if(scheduleToUpdate.week === 'championship'){
                    scheduleToUpdate.album.push('championship')
                }else if(scheduleToUpdate.week.includes('playoff')){
                    scheduleToUpdate.album.push(scheduleToUpdate.week.replaceAll(' ', '_'));
                }else{
                    scheduleToUpdate.album.push(schedule.length + '_' + scheduleToUpdate.results.length)
                }
            }
        }
    }
    // response.values.forEach((row, rowIndex) => {
        
        
    // });

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

export function isRegularSeason(weekLabel){
    if(weekLabel.toLowerCase().includes('championship') || weekLabel.toLowerCase().includes('playoff')){
        return false;
    }else if(weekLabel.toLowerCase().includes('week')){
        return true;
    }
    return false;
}

export function isChampionship(weekLabel){
    if(weekLabel.toLowerCase().includes('championship')){
        return true;
    }
    return false;
}

export function createStandingsObject(schedule){
    let standings = {
        regularSeason: {},
        championship: {}
    };

    schedule.forEach((week, index)=>{
        if(isRegularSeason(week.week.toLowerCase())){ 
            week.results.forEach(group => {
                group.forEach(performance => {
                    let player = performance.player.trim();
                    if(!standings.regularSeason[player]){
                        standings.regularSeason[player] = {score: 0, gamesPlayed: 0, gamesToPlay: 0, weeklyScores: new Array(index).fill(0)};
                    }
                    if(performance.placement){
                        standings.regularSeason[player].score += scoringRubric(performance.placement);
                        standings.regularSeason[player].gamesPlayed++;
                        standings.regularSeason[player].weeklyScores.push(scoringRubric(performance.placement));
                    }
                    standings.regularSeason[player].gamesToPlay++;
                })
            })
        }else if(isChampionship(week.week.toLowerCase())){
            week.results.forEach(group => {
                group.forEach(performance => {
                    let player = performance.player.trim();
                    if(!standings.championship[player]){
                        standings.championship[player] = {score: 0, gamesPlayed: 0, gamesToPlay: 0};
                    }
                    if(performance.placement){
                        standings.championship[player].score += scoringRubric(performance.placement);
                        standings.championship[player].gamesPlayed++;
                    }
                    standings.championship[player].gamesToPlay++;
                })
            })
        }
       
    })
    
    //regular season sorting
    let standingsArray = Object.keys(standings.regularSeason).map(player => {
        let gamesPlayed = standings.regularSeason[player].gamesPlayed;
        let score = standings.regularSeason[player].score;
        let gamesToPlay = standings.regularSeason[player].gamesToPlay;
        let weeklyScores = standings.regularSeason[player].weeklyScores;
        // let strengthOfSchedule = gamesPlayed > 0 ? score / gamesPlayed : 0;
        return {player: player, points: score, gamesPlayed: gamesPlayed, gamesToPlay: gamesToPlay, weeklyScores};
    })
    standingsArray.sort((a, b) => {
        if(a.points > b.points) {
            return -1;
        }else if(b.points > a.points){
            return 1;
        }else if(Math.max(...a.weeklyScores) > Math.max(...b.weeklyScores)){
            return -1;
        }else if(Math.max(...a.weeklyScores) < Math.max(...b.weeklyScores)){
            return 1;
        }else if(Math.max(...a.weeklyScores) > 0){
            let max = Math.max(...a.weeklyScores);
            while(max > 0){
                if(getPlacementCount(a, max) > getPlacementCount(b, max)){
                    return -1;
                }else if(getPlacementCount(a, max) < getPlacementCount(b, max)){
                    return 1;
                }
                max--;
            }
            return 1;
        }
    })

    let mostRecentPlacement = 1;
    standingsArray.forEach((person, index) => {

        if(index === 0 || person.points !== standingsArray[index - 1].points){
            person.placement = index + 1;
            mostRecentPlacement = index + 1;
        }else{
            let arePlacementsIdentical = true;
            let a = person;
            let b = standingsArray[index - 1];
            let max = Math.max(...b.weeklyScores);
            while(max > 0){
                if(getPlacementCount(a, max) > getPlacementCount(b, max)){
                    arePlacementsIdentical = false;
                }else if(getPlacementCount(a, max) < getPlacementCount(b, max)){
                    arePlacementsIdentical = false;
                }
                max--;
            }
            if(arePlacementsIdentical){
                person.placement = mostRecentPlacement;
            }else{
                person.placement = index + 1;
                mostRecentPlacement = index + 1;
            }
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

    mostRecentPlacement = 1;
    championshipArray.forEach((person, index) => {
        if(index === 0 || person.points !== championshipArray[index - 1].points){
            person.placement = index + 1;
            mostRecentPlacement = index + 1;
        }else{
            person.placement = mostRecentPlacement;
        }
    })

    standings.regularSeason = standingsArray;
    standings.championship = championshipArray;
    return standings;
}

export function getPlacementCount(player, placement){
    return player.weeklyScores.filter(score => score === placement).length;
}

export function createStrengthOfScheduleObject(schedule, standings){

    // let gamesPerWeek = 4;
    let sosObject = {};
    schedule.forEach(week=>{
        if(isRegularSeason(week.week.toLowerCase())){ 
            week.results.forEach(group => {
                // gamesPerWeek = group.length;
                group.forEach(performance => {

                    if(!sosObject[performance.player]){
                        let player = standings.regularSeason.find(standing => { return standing.player === performance.player})
                        sosObject[performance.player] = {strengthOfScheduleTotal: 0, gamesPlayed: player.gamesPlayed, gamesToPlay: player.gamesToPlay};
                    }
                    group.forEach(performance2 => {
                        if(performance !== performance2){
                            let performance2Player = standings.regularSeason.find(standing => { return standing.player === performance2.player})
                            let sosValue = performance2Player.gamesPlayed > 0 ? performance2Player.points / performance2Player.gamesPlayed : 0;
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
    const intPlacement = parseInt(placement)
    if(intPlacement === 1){
        return 3;
    }else if(intPlacement === 2){
        return 2;
    }else if(intPlacement === 3){
        return 1;
    }
    return 0;
}


//TODO: Evaluate this for updates to playoff images
export function getImageFileNamesToLoad(schedule, response){
    let mostPossibleImages = 0;
    let championshipPlayed = false;
    schedule.forEach(week=>{
        if(isRegularSeason(week.week.toLowerCase())){ 
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
        if(week.game && week.game !== 'TBD'){
            gameNameQueryString += week.game + ',';
        }    
    })

    try{
        let response = await getBoardGameGeekIds(gameNameQueryString.replaceAll(' ', '+'))
        //console.log(response);
        return response;
    }catch(error){
        console.log('search failed...');
        console.log(error);
        throw error;
    }
    
}