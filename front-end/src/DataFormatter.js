import {getBoardGameGeekIds } from "./callouts/CalloutFactory";

/** Max player columns read per table (tie-break games may have more than 4). */
const MAX_SLOTS_PER_TABLE = 8;

/**
 * Pre-playoff tie-break weeks from the sheet (e.g. "Tie Break", "Tiebreaker (4 vs 5)").
 * Not scored as regular season or playoffs; used only for standings order.
 */
export function isTieBreakWeek(weekLabel) {
    const n = String(weekLabel)
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return n.includes('tie break') || n.includes('tiebreaker');
}

export function createScheduleObject(response) {

    //IF Cell F1 is populated, we're hiding this season
    if(response?.values?.length > 0 && response.values[0].length === 6){
        return null;
    }
    let numberOfPlayersPerGame = 4;
    let infoHeaderRows = 1;
    let rowsPerGroup = 3
    let numberOfGamesPerWeek = getNumberOfGamesPerWeek(response, rowsPerGroup);
    let rowsBetweenWeeksInSpreadsheet = numberOfGamesPerWeek * rowsPerGroup + infoHeaderRows;
    
    let schedule = [];
    let playoffRowStart = 0;

    for(let rowIndex = 0; rowIndex < response.values.length; rowIndex++){

        let row = response.values[rowIndex];
        let rowReference = rowIndex % rowsBetweenWeeksInSpreadsheet;

        //Weekly title rows in spreadsheet
        if(rowReference === 0){

            //If not regular season, we're done here and need to start parsing the tiebreaker games and playoffs
            if(!isRegularSeason(row[0])){
                playoffRowStart = rowIndex;
                break;
            }

            schedule.push({
                week: row[0], 
                game: row[1], 
                dates: row[2],
                headlines: row[3],
                results: [],
                album: []
            });
        
        //For the first row of each group in a given week
        }else if(rowReference % rowsPerGroup === 1){
            let placementRow = response.values[rowIndex + 1];
            let subRow = response.values[rowIndex + 2];
            let scheduleToUpdate = schedule[schedule.length - 1];

            let newGroup = [];
            for(let j = 1; j <= numberOfPlayersPerGame; j++){
                    if(row[j]){
                    let placement = placementRow[j];
                    let sub = subRow[j]
                    let playerEntry ={player: row[j].trim(), placement: placement};
                    if(sub){
                        playerEntry.sub = sub;
                    } 
                    newGroup.push(playerEntry);
                }
                // let groupToUpdate = scheduleToUpdate.results[scheduleToUpdate.results.length-1];
            }
            if(newGroup.length > 0){
                let location = placementRow[5] ? placementRow[5] : null;
                scheduleToUpdate.results.push({location: location, players: newGroup});
            }

            //For album, we need to match the naming convention (ex: 2_3) to the given week (2) and given group (3)
            // if(scheduleToUpdate.results?.length > 0 && scheduleToUpdate.results[scheduleToUpdate.results.length-1][0]?.placement){
                
            //     if(scheduleToUpdate.week === 'championship'){
            //         scheduleToUpdate.album.push('championship')
            //     }else{
            //         scheduleToUpdate.album.push(schedule.length + '_' + scheduleToUpdate.results.length)
            //     }
            // }
        }
    }

    //tieberakers, Playoffs and championship setup
    let rowsBetweenChampionshipWeeks = 1 * rowsPerGroup + infoHeaderRows;
    for(let rowIndex = playoffRowStart; rowIndex < response.values.length; rowIndex++){
        let row = response.values[rowIndex];
        let rowReference = (rowIndex - playoffRowStart) % rowsBetweenChampionshipWeeks;
        if(rowReference === 0){
            schedule.push({
                week: row[0], 
                game: row[1], 
                dates: row[2], 
                headlines: row[3],
                results: [],
                album: [],
                isTieBreak: isTieBreakWeek(row[0]),
                isPlayoff: isPlayoff(row[0]) && !isChampionship(row[0]),
                isChampionship: isChampionship(row[0])
            });
        }else if(rowReference % rowsPerGroup === 1){
            let placementRow = response.values[rowIndex + 1];
            let subRow = response.values[rowIndex + 2];
            let scheduleToUpdate = schedule[schedule.length - 1];
            // scheduleToUpdate.results.push([]);
            let newGroup = [];
            for(let j = 1; j <= numberOfPlayersPerGame; j++){
                if(row[j]){
                    let placement = placementRow[j];
                    let sub = subRow[j]
                    let playerEntry ={player: row[j].trim(), placement: placement};
                    if(sub){
                        playerEntry.sub = sub;
                    } 
                    newGroup.push(playerEntry);
                }
                // let groupToUpdate = scheduleToUpdate.results[scheduleToUpdate.results.length-1];
            }
            if(newGroup.length > 0){
                let location = placementRow[5] ? placementRow[5] : null;
                scheduleToUpdate.results.push({location: location, players: newGroup});
            }

            //For album, we need to match the naming convention (ex: 2_3) to the given week (2) and given group (3)
            // if(scheduleToUpdate.results?.length > 0 && scheduleToUpdate.results[scheduleToUpdate.results.length-1][0]?.placement){
                
            //     if(scheduleToUpdate.week === 'championship'){
            //         scheduleToUpdate.album.push('championship')
            //     }else if(scheduleToUpdate.week.includes('playoff')){
            //         scheduleToUpdate.album.push(scheduleToUpdate.week.replaceAll(' ', '_'));
            //     }else{
            //         scheduleToUpdate.album.push(schedule.length + '_' + scheduleToUpdate.results.length)
            //     }
            // }
        }
    }
    // response.values.forEach((row, rowIndex) => {
        
        
    // });

    return schedule;
}

function getNumberOfGamesPerWeek(scheduleResponse, rowsPerGroup){
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
    return numberOfRowsBetweenWeeks / rowsPerGroup;
}

export function isRegularSeason(weekLabel){
    const weekLabelLower = weekLabel.toLowerCase();
    if (isTieBreakWeek(weekLabelLower)) return false;
    if(weekLabelLower.includes('championship') || weekLabelLower.includes('playoff')){
        return false;
    }else if(weekLabelLower.includes('week')){
        return true;
    }
    return false;
}

export function isPlayoff(weekLabel){
    const weekLabelLower = weekLabel.toLowerCase();
    if(weekLabelLower.includes('championship') || weekLabelLower.includes('playoff')){
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
                group.players.forEach(performance => {
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
                group.players.forEach(performance => {
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
        return {
            player: player,
            points: score,
            gamesPlayed: gamesPlayed,
            gamesToPlay: gamesToPlay,
            weeklyScores,
            tieBreakGroupId: null,
            tieBreakPlace: null
        };
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

    //Pass in mostly sorted standings array to attach tie-break metadata and reorder contiguous tied blocks
    applyTieBreakToStandings(schedule, standingsArray);

    //Break ties by standard rules (points, then weekly scores, placement count, then playoff tie break games)
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
            const sameTieBreakGame =
                a.tieBreakGroupId &&
                b.tieBreakGroupId &&
                a.tieBreakGroupId === b.tieBreakGroupId &&
                a.tieBreakPlace !== b.tieBreakPlace;
            if (arePlacementsIdentical && sameTieBreakGame) {
                person.placement = index + 1;
                mostRecentPlacement = index + 1;
            }else if(arePlacementsIdentical){
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



function collectTieBreakGroups(schedule) {
    const groups = [];
    schedule.forEach(week => {
        if (!isTieBreakWeek(week.week.toLowerCase())) return;
        week.results.forEach(group => {
            const withPlace = (group.players || []).filter(
                p => p && p.placement !== undefined && p.placement !== '' && !Number.isNaN(parseInt(p.placement, 10))
            );
            if (withPlace.length < 2) return;
            const namesSorted = withPlace.map(p => p.player.trim()).sort();
            const groupId = namesSorted.join('|');
            groups.push({
                groupId,
                entries: withPlace.map(p => ({
                    player: p.player.trim(),
                    place: parseInt(p.placement, 10)
                }))
            });
        });
    });
    return groups;
}

/** Attach tie-break meta and reorder contiguous tied blocks in the sorted standings array. */
function applyTieBreakToStandings(schedule, standingsArray) {
    const groups = collectTieBreakGroups(schedule);
    groups.forEach(({ groupId, entries }) => {
        entries.forEach(e => {
            const row = standingsArray.find(r => r.player === e.player);
            if (row && row.tieBreakGroupId == null) {
                row.tieBreakGroupId = groupId;
                row.tieBreakPlace = e.place;
            }
        });
    });
    groups.forEach(({ entries }) => {
        const nameSet = new Set(entries.map(e => e.player));
        const indices = [];
        standingsArray.forEach((r, i) => {
            if (nameSet.has(r.player)) indices.push(i);
        });
        if (indices.length !== entries.length) return;
        indices.sort((a, b) => a - b);
        if (indices[indices.length - 1] - indices[0] !== indices.length - 1) return;
        const minI = indices[0];
        const byPlace = [...entries].sort((a, b) => a.place - b.place);
        const orderedRows = byPlace.map(e => standingsArray.find(r => r.player === e.player)).filter(Boolean);
        if (orderedRows.length !== entries.length) return;
        standingsArray.splice(minI, orderedRows.length, ...orderedRows);
    });
}

export function createStrengthOfScheduleObject(schedule, standings){

    // let gamesPerWeek = 4;
    let sosObject = {};
    schedule.forEach(week=>{
        if(isRegularSeason(week.week.toLowerCase())){ 
            week.results.forEach(group => {
                // gamesPerWeek = group.length;
                group.players.forEach(performance => {

                    if(!sosObject[performance.player]){
                        let player = standings.regularSeason.find(standing => { return standing.player === performance.player})
                        sosObject[performance.player] = {strengthOfScheduleTotal: 0, gamesPlayed: player.gamesPlayed, gamesToPlay: player.gamesToPlay};
                    }
                    group.players.forEach(performance2 => {
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
        if(isTieBreakWeek(week.week.toLowerCase())) return;
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

    let numberOfGamesPerWeek = getNumberOfGamesPerWeek(response, 3);

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

    let schedules = {};

    data.valueRanges.forEach(sheet => {
        let scheduleYear = sheet.range.split('-')[1].split('\'')[0];
        let scheduleObject = createScheduleObject(sheet);
        if(scheduleObject){
            schedules[scheduleYear] = scheduleObject;
        }
    })

    console.log(schedules);

    let analysisObject = {};
    let postSeasonObject = {};
    Object.keys(schedules).forEach((year) => {
        
        let schedule = schedules[year];

        schedule.forEach(week=>{
            if(isTieBreakWeek(week.week.toLowerCase())) return;
            if(isRegularSeason(week.week.toLowerCase())){ 
                week.results.forEach(group => {
                    // gamesPerWeek = group.length;
                    group.players.forEach(performance => {
                        if(performance.placement){
                            if(!analysisObject[performance.player]){
                                analysisObject[performance.player] = {
                                    name: performance.player,
                                    gamesPlayed: 0,
                                    placements: {first: 0, second: 0, third: 0, fourth: 0},
                                    headToHead: {},
                                    averagePosition: 0,
                                    gamePerformance: [],
                                    opponents: [],
                                    uniqueOpponents: [],
                                    points: 0
                                }
                                // let player = standings.regularSeason.find(standing => { return standing.player === performance.player})
                                // sosObject[performance.player] = {strengthOfScheduleTotal: 0, gamesPlayed: player.gamesPlayed, gamesToPlay: player.gamesToPlay};
                            }

                            analysisObject[performance.player].gamesPlayed++;
                            analysisObject[performance.player].gamePerformance.push({game: week.game, season: year, week: week.week, placement: performance.placement});
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

                            analysisObject[performance.player].points += scoringRubric(performance.placement);

                            group.players.forEach(performance2 => {
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

                                    analysisObject[performance.player].opponents.push(performance2.player);
                                    if(!analysisObject[performance.player].uniqueOpponents.includes(performance2.player)){
                                        analysisObject[performance.player].uniqueOpponents.push(performance2.player);
                                    }
                                }
                            })
                        }
                        
                    })
                })
            }else{
                week.results.forEach(group => {
                    // gamesPerWeek = group.length;
                    group.players.forEach(performance => {

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
                                    appearanceArray: [],
                                    gamePerformance: [],
                                    opponents: [],
                                    uniqueOpponents: [],
                                    points: 0
                                }
                            }

                            if(!postSeasonObject[performance.player].appearanceArray.includes(year)){
                                postSeasonObject[performance.player].appearanceArray.push(year);
                                postSeasonObject[performance.player].playoffAppearances++;
                            }
                            
                            postSeasonObject[performance.player].gamePerformance.push({game: week.game, week: week.week, season: year, placement: performance.placement});
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
                            postSeasonObject[performance.player].points += scoringRubric(performance.placement);

                            group.players.forEach(performance2 => {
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
                                    
                                    postSeasonObject[performance.player].opponents.push(performance2.player);
                                    if(!postSeasonObject[performance.player].uniqueOpponents.includes(performance2.player)){
                                        postSeasonObject[performance.player].uniqueOpponents.push(performance2.player);
                                    }
                                }
                            })
                        }
                        
                    })
                })


            }
        })
    })

    
    //DEFAULT SORTING
    Object.values(analysisObject).forEach(player => {

        player.roundedAveragePosition = Math.round(player.averagePosition * 100) / 100;
        player.averageScore = Math.round((player.points / player.gamesPlayed) * 100) / 100;
        player.uniqueOpponentsTotal = player.uniqueOpponents.length;
        player.opponentsTotal = player.opponents.length;
        let opponentAverageScoreSum = 0;
        player.opponents.forEach(opp => {
            opponentAverageScoreSum += analysisObject[opp].points / analysisObject[opp].gamesPlayed;
        })
        player.averageOpponentStrength = Math.round((opponentAverageScoreSum / player.opponentsTotal) * 100) / 100;

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

    Object.values(analysisObject).forEach(player => {
        let gamePerformance = Object.values(player.gamePerformance).sort((a, b) => {
            if(a.season > b.season) {
                return -1;
            }else if(a.season < b.season){
                return 1;
            }else{
                if(a.week > b.week){
                    return -1
                }else{
                    return 1;
                }
            }
        })
        player.gamePerformance = gamePerformance;
    })

    let analysisArray = Object.values(analysisObject).sort((a, b) => {
        if(a.averagePosition < b.averagePosition) {
            return -1;
        }else{
            return 1;
        }
    })
    
    
    Object.values(postSeasonObject).forEach(player => {
        
        player.roundedAveragePosition = Math.round(player.averagePosition * 100) / 100;
        player.averageScore = Math.round((player.points / player.gamesPlayed) * 100) / 100;
        player.uniqueOpponentsTotal = player.uniqueOpponents.length;
        player.opponentsTotal = player.opponents.length;
        let opponentAverageScoreSum = 0;
        player.opponents.forEach(opp => {
            opponentAverageScoreSum += postSeasonObject[opp].points / postSeasonObject[opp].gamesPlayed;
        })
        player.averageOpponentStrength = Math.round((opponentAverageScoreSum / player.opponentsTotal) * 100) / 100;



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

    Object.values(postSeasonObject).forEach(player => {
        let gamePerformance = Object.values(player.gamePerformance).sort((a, b) => {
            if(a.season > b.season) {
                return -1;
            }else if(a.season < b.season){
                return 1;
            }else{
                if(a.week > b.week){
                    return -1
                }else{
                    return 1;
                }
            }
        })
        player.gamePerformance = gamePerformance;
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