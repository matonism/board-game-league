const https = require('https');
var convert = require('xml-js');


async function getBoardGameInfo(queryParams){

    let response = {};
    try{
        let games = queryParams.games;
        if(games){
            games = decodeURIComponent(games).split(',');
        }

        let searchResults = {};
        //Using standard for loop because forEach cannot handle async await
        for(let i = 0; i < games.length; i++){
            let game = games[i];
            if(game != 'TBD' && game != ''){
                try{
                    let XMLResponse = await makeHTTPSRequest('/search/', {query: game.replace(' ', '+'), type: 'boardgame', exact: 1});
                    searchResults[game] = JSON.parse(convert.xml2json(XMLResponse));
                    // let response = xml2json(XMLResponse);
                }catch(error){
                    console.log(error);
                }
            }
        }  

        //TODO: May want to sort by the oldest or newest?
        let gameKeys = Object.keys(searchResults);
        for(let i = 0; i < gameKeys.length; i++){
            // console.log(gameKeys[i]);
            if(searchResults[gameKeys[i]].elements[0].elements){
                searchResults[gameKeys[i]].elements[0].elements = sortSearchResultsByYearPublished(searchResults[gameKeys[i]].elements[0].elements);
                response[gameKeys[i]] = searchResults[gameKeys[i]].elements[0].elements[0].attributes.id;
            }
        }
        // console.log(response);
    }catch(error){
        throw error;
    }
    return response;
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


async function makeHTTPSRequest(path, params){
    const response = await new Promise((resolve, reject) => {

        let url = 'https://boardgamegeek.com/xmlapi2';
        url += path;
        url = Object.keys(params).reduce((currentValue, nextValue) => 
            currentValue += nextValue + '=' + params[nextValue] + '&',
            url += '?'
        )

        let dataString = '';
        const req = https.get(url, function(res) {
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