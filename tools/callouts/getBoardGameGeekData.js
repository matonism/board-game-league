const https = require('https');
var convert = require('xml-js');
const dotenv = require('dotenv');
dotenv.config();

//Mapping Game Names to Id's in board game geek
//This is specifically for games that share a name with multiple other games, where we cannot rely on the most recent published date among them
//Not doing this for every game because I don't want to maintain it each time new games get added
//I just want to address one-off isses as they appear
const gamesToIds = {
    "Harvest": "395623"
}

async function getBoardGameInfo(queryParams){

    let response = {};
    let gameObjects = {};
    try{
        let games = queryParams.games;
        if(games){
            games = decodeURIComponent(games).split(',');
        }

        //Step 1: Search all board games that you need to get data for by name one-by-one
        let searchResults = {};
        //Using standard for loop because forEach cannot handle async await
        for(let i = 0; i < games.length; i++){
            let game = games[i];
            if(game != 'TBD' && game != ''){
                try{
                    console.log(game);
                    let XMLResponse = await makeHTTPSRequest('/search/', {query: game.replaceAll(' ', '+'), type: 'boardgame'});
                    console.log(XMLResponse);
                    searchResults[game] = JSON.parse(convert.xml2json(XMLResponse));

                    await setTimeout(()=>{}, 2000);
                    // let response = xml2json(XMLResponse);
                }catch(error){
                    console.log(error);
                }
            }
        }  

        //Step 2: sort the results by year published, and take the most appropriate title
        let gameKeys = Object.keys(searchResults);
        console.log(searchResults);
        for(let i = 0; i < Object.keys(gameKeys).length; i++){
            // console.log(gameKeys[i]);
            if(searchResults[gameKeys[i]].elements[0].elements){
                if(gameKeys[i] == 'Harvest'){
                    console.log(searchResults[gameKeys[i]].elements[0].elements);
                }
                if(Object.keys(gamesToIds).includes(gameKeys[i])){
                    searchResults[gameKeys[i]].elements[0].elements = sortByIdMatch(searchResults[gameKeys[i]].elements[0].elements, gamesToIds[gameKeys[i]]);
                }else{
                    searchResults[gameKeys[i]].elements[0].elements = sortSearchResultsByYearPublished(searchResults[gameKeys[i]].elements[0].elements);
                }
                response[gameKeys[i]] = searchResults[gameKeys[i]].elements[0].elements[0].attributes.id;
            }
        }

        console.log(response);

        //Step 3: Use the Id to get the full details of each retrieved game
        let detailResults = {};
        for(let i = 0; i < Object.keys(gameKeys).length; i++){
            let gameId = response[gameKeys[i]];
            //https://boardgamegeek.com/xmlapi2/thing/?id=9209&stats=1
            try{
                let XMLResponse = await makeHTTPSRequest('/thing/', {id: gameId, stats: 1});
                detailResults[gameKeys[i]] = JSON.parse(convert.xml2json(XMLResponse));
                await setTimeout(()=>{},2000);
                // let response = xml2json(XMLResponse);
            }catch(error){
                console.log(error);
            }
        }

        //Step 4: Collect just the relevant data to return it 
        for(let i = 0; i < Object.keys(gameKeys).length; i++){
            let gameDetail = detailResults[gameKeys[i]];
            let gameElements = gameDetail.elements[0].elements[0].elements;

            let gameObject = {
                description: '',
                categories: [],
                mechanics: [],
                rating: '',
                difficulty: ''
            };

            for(let j = 0; j < gameElements.length; j++){
                let element = gameElements[j];
                if(element.name === 'description'){
                    gameObject.description = element.elements[0].text;
                }
                if(element.name === 'link'){
                    if(element.attributes?.type === 'boardgamecategory'){
                        gameObject.categories.push(element.attributes.value);
                    }
                    if(element.attributes?.type === 'boardgamemechanic'){
                        gameObject.mechanics.push(element.attributes.value);
                    }
                }
                if(element.name === 'statistics'){
                    let ratings = element.elements[0];
                    for(let k = 0; k < ratings.elements.length; k++){
                        if(ratings.elements[k].name === 'average'){
                            gameObject.rating = ratings.elements[k].attributes.value;
                        }
                        if(ratings.elements[k].name ==='averageweight'){
                            gameObject.difficulty = ratings.elements[k].attributes.value;
                        }
                    }
                }
            }
            gameObjects[gameKeys[i]] = gameObject;
        }
    }catch(error){
        throw error;
    }            
    console.log(gameObjects);
    return gameObjects;
}

// {
//     gameName: {
//         elements [
//             {
//                 name: "items",
//                 attributes:[],
//                 elements: [
//                     {
//                         name: "item"
//                     },
//                     {
//                         name: "item"
//                     }
//                 ]
//             }
//         ]
//     }
// }

//grab the most recent game
function sortSearchResultsByYearPublished(gameVersions){

    // console.log('gameVersions');
    // console.log(gameVersions);
    if(gameVersions.length > 1){
        gameVersions = gameVersions.sort((a, b) => {

            let yearPublishedA = a.elements.find(element => {return element.name === 'yearpublished'})
            // console.log(yearPublishedA);
            let yearPublishedB = b.elements.find(element => {return element.name === 'yearpublished'})
            let gameNameMatchTypeA = a.elements.find(element => {return element.name === 'name'})
            let gameNameMatchTypeB = b.elements.find(element => {return element.name === 'name'})


            if(!yearPublishedA){
                return 1;
            }
            if(!yearPublishedB){
                return -1;
            }
            if(gameNameMatchTypeB.attributes.type === 'secondary'){
                return -1;
            }else if(gameNameMatchTypeA.attributes.type === 'secondary'){
                return 1;
            }else if(yearPublishedA.attributes.value > yearPublishedB.attributes.value){
                return -1
            }else{
                return 1;
            }
        });
    }
    
    return gameVersions;
}

function sortByIdMatch(gameVersions, gameId){
    if(gameVersions.length > 1){
        gameVersions = gameVersions.sort((a, b) => {

            if(a?.attributes?.id === gameId){
                return -1;
            }else{
                return 1;
            }
        });
    }
    
    return gameVersions;
}

async function makeHTTPSRequest(path, params){
    const response = await new Promise((resolve, reject) => {

        let url = 'https://boardgamegeek.com/xmlapi2';
        url += path;
        url = Object.keys(params).reduce((currentValue, nextValue) => 
            currentValue += nextValue + '=' + params[nextValue] + '&',
            url += '?'
        )
        
        const options = {
            hostname: 'boardgamegeek.com',
            port: 443,
            path: '/xmlapi2' + path + '?' + Object.keys(params).reduce((currentValue, nextValue) => currentValue += nextValue + '=' + params[nextValue] + '&',''),
            headers: {
                'Authorization': 'Bearer ' + process.env.BGG_TOKEN // Add the Authorization header
            }
        };

        options.path = options.path.replaceAll(' ', '+');
        
        let dataString = '';
        const req = https.get(options, function(res) {
            res.on('data', chunk => {
                dataString += chunk;
            });
            res.on('end', () => {
                resolve(dataString);
            });
        });
        
        req.on('error', (e) => {
            reject(e);
            console.error(e);
        });
    })

    return response;
}


module.exports = getBoardGameInfo;