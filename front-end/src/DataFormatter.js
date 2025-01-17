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
        return 1;
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

        if(powerRankingsResponse.values[0].length > 0){
            let previousRankings = [];

            for(let columnIndex = 0; columnIndex < powerRankingsResponse.values[0].length; columnIndex++){
                for(let rowIndex = 0; rowIndex < powerRankingsResponse.values.length; rowIndex++){
                    if(powerRankingsResponse.values[1].length > columnIndex){
                    let value = powerRankingsResponse.values[rowIndex][columnIndex].trim();
                    if(rowIndex === 0){
                            powerRankings.push({
                                label: value,
                                rankings: []
                            })
                        previousRankings.push({});
                    }else{
                        previousRankings[columnIndex][value] = rowIndex;
                        if(columnIndex>0){ 
                            powerRankings[columnIndex].rankings.push({name: value, delta: previousRankings[columnIndex-1][value] - rowIndex});
                        }else{
                            powerRankings[columnIndex].rankings.push({name: value, delta: null});
                        }
                    }
                    
                }
                }
            }

        }
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

export function createHistoricalDataObject(data){

    let schedules = [];

    data.valueRanges.forEach(sheet => {
        schedules.push(createScheduleObject(sheet));
    })

    console.log(schedules);
    // let analysisObject = {
    //     name: '',
    //     headToHead: {
    //         'Richie' : {
    //             W: 1,
    //             L: 2,
    //             gamesPlayed: 3,
    //             winRate: 33.3
    //         }
    //     },
        // W:
        // L:
        // gamesPlayed: 
        // winRate: 

    // };

    let analysisObject = {};
    let postSeasonObject = {};

    schedules.forEach((schedule, scheduleIndex) => {
        
        schedule.forEach(week=>{
            if(isRegularSeason(week.week.toLowerCase())){ 
                week.results.forEach(group => {
                    // gamesPerWeek = group.length;
                    group.forEach(performance => {

                        if(performance.placement){
                            if(!analysisObject[performance.player]){
                                analysisObject[performance.player] = {
                                    name: performance.player,
                                    gamesPlayed: 0,
                                    placements: {first: 0, second: 0, third: 0, fourth: 0},
                                    headToHead: {},
                                    averagePosition: 0
                                }
                                // let player = standings.regularSeason.find(standing => { return standing.player === performance.player})
                                // sosObject[performance.player] = {strengthOfScheduleTotal: 0, gamesPlayed: player.gamesPlayed, gamesToPlay: player.gamesToPlay};
                            }

                            analysisObject[performance.player].gamesPlayed++;
                            if(performance.placement === "1"){
                                analysisObject[performance.player].placements.first++;
                            }else if(performance.placement === "2"){
                                analysisObject[performance.player].placements.second++;
                            }else if(performance.placement === "3"){
                                analysisObject[performance.player].placements.third++;
                            }else if(performance.placement === "4"){
                                analysisObject[performance.player].placements.fourth++;
                            }
                            analysisObject[performance.player].averagePosition = ((analysisObject[performance.player].averagePosition * (analysisObject[performance.player].gamesPlayed - 1)) + parseInt(performance.placement)) / analysisObject[performance.player].gamesPlayed;

                            group.forEach(performance2 => {
                                if(performance !== performance2){
                                    if(!analysisObject[performance.player].headToHead[performance2.player]){
                                        analysisObject[performance.player].headToHead[performance2.player] = {
                                            name: performance2.player,
                                            wins: 0,
                                            losses: 0,
                                            winRate: 0,
                                            gamesPlayed: 0
                                        }
                                    }
                                    let headToHead = analysisObject[performance.player].headToHead[performance2.player];
                                    headToHead.gamesPlayed++;

                                    if(performance.placement > performance2.placement){
                                        headToHead.losses++;
                                    }else{
                                        headToHead.wins++;
                                    }
                                    
                                    headToHead.winRate = (headToHead.wins / headToHead.gamesPlayed);
                                }
                            })
                        }
                        
                    })
                })
            }else{
                week.results.forEach(group => {
                    // gamesPerWeek = group.length;
                    group.forEach(performance => {

                        if(performance.placement){
                            if(!postSeasonObject[performance.player]){
                                postSeasonObject[performance.player] = {
                                    name: performance.player,
                                    gamesPlayed: 0,
                                    placements: {first: 0, second: 0, third: 0, fourth: 0},
                                    headToHead: {},
                                    averagePosition: 0,
                                    championships: 0,
                                    championshipAppearances: 0,
                                    playoffAppearances: 0,
                                    appearanceArray: []
                                }
                            }

                            if(!postSeasonObject[performance.player].appearanceArray.includes(scheduleIndex)){
                                postSeasonObject[performance.player].appearanceArray.push(scheduleIndex);
                                postSeasonObject[performance.player].playoffAppearances++;
                            }
                            postSeasonObject[performance.player].gamesPlayed++;
                            if(isChampionship(week.week.toLowerCase())){
                                postSeasonObject[performance.player].championshipAppearances++;
                            }
                            if(performance.placement === "1"){
                                postSeasonObject[performance.player].placements.first++;
                                
                                if(isChampionship(week.week.toLowerCase())){
                                    postSeasonObject[performance.player].championships++;
                                }
                            }else if(performance.placement === "2"){
                                postSeasonObject[performance.player].placements.second++;
                            }else if(performance.placement === "3"){
                                postSeasonObject[performance.player].placements.third++;
                            }else if(performance.placement === "4"){
                                postSeasonObject[performance.player].placements.fourth++;
                            }
                            postSeasonObject[performance.player].averagePosition = ((postSeasonObject[performance.player].averagePosition * (postSeasonObject[performance.player].gamesPlayed - 1)) + parseInt(performance.placement)) / postSeasonObject[performance.player].gamesPlayed;

                            group.forEach(performance2 => {
                                if(performance !== performance2){
                                    if(!postSeasonObject[performance.player].headToHead[performance2.player]){
                                        postSeasonObject[performance.player].headToHead[performance2.player] = {
                                            name: performance2.player,
                                            wins: 0,
                                            losses: 0,
                                            winRate: 0,
                                            gamesPlayed: 0
                                        }
                                    }
                                    let headToHead = postSeasonObject[performance.player].headToHead[performance2.player];
                                    headToHead.gamesPlayed++;

                                    if(performance.placement > performance2.placement){
                                        headToHead.losses++;
                                    }else{
                                        headToHead.wins++;
                                    }
                                    
                                    headToHead.winRate = (headToHead.wins / headToHead.gamesPlayed);
                                }
                            })
                        }
                        
                    })
                })


            }
        })
    })

    
    Object.values(analysisObject).forEach(player => {
        let headToHeadArray = Object.values(player.headToHead).sort((a, b) => {
            if(a.gamesPlayed > b.gamesPlayed) {
                return -1;
            }else if(a.gamesPlayed < b.gamesPlayed){
                return 1;
            }else{
                if(a.winRate > b.winRate){
                    return -1
                }else{
                    return 1;
                }
            }
        })
        player.headToHead = headToHeadArray;
    })

    let analysisArray = Object.values(analysisObject).sort((a, b) => {
        if(a.averagePosition < b.averagePosition) {
            return -1;
        }else{
            return 1;
        }
    })
    
    
    Object.values(postSeasonObject).forEach(player => {
        let headToHeadArray = Object.values(player.headToHead).sort((a, b) => {
            if(a.gamesPlayed > b.gamesPlayed) {
                return -1;
            }else if(a.gamesPlayed < b.gamesPlayed){
                return 1;
            }else{
                if(a.winRate > b.winRate){
                    return -1
                }else{
                    return 1;
                }
            }
        })
        player.headToHead = headToHeadArray;
    })
    
    let postSeasonArray = Object.values(postSeasonObject).sort((a, b) => {
        if(a.championships > b.championships) {
            return -1;
        }else if(a.championships < b.championships){
            return 1;
        }else if(a.championshipAppearances > b.championshipAppearances){
            return -1
        }else if(a.championshipAppearances < b.championshipAppearances){
            return 1;
        }else if(a.playoffAppearances > b.playoffAppearances){
            return -1
        }else{
            return 1;
        }
    })

    return {
        regularSeason: analysisArray,
        postSeason: postSeasonArray
    };

}