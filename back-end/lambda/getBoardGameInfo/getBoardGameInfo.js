const https = require('https');
var convert = require('xml-js');


//Mapping Game Names to Id's in board game geek
//This is specifically for games that share a name with multiple other games, where we cannot rely on the most recent published date among them
//Not doing this for every game because I don't want to maintain it each time new games get added
//I just want to address one-off isses as they appear
const gamesToIds = {
    "Harvest": "395623",
    'Ticket to Ride': '9209',
    'Catan': '13',
    'Splendor': '148228',
    'Sushi Go Party!': '192291',
    'Monopoly': '36611',
    'Small World': '40692',
    '7 Wonders': '68448',
    'Imhotep': '191862',
    'Carcassonne': '822',
    'Tokaido': '123540',
    'Azul': '230802',
    'Sagrada': '199561',
    'Evolution': '155703',
    'Dominion': '36218',
    'Juicy Fruits': '325698',
    'The Quacks of Quedlinburg': '244521',
    'Calico': '283155',
    'Cascadia': '295947',
    'The Quest for El Dorado': '217372',
    'The Isle of Cats': '281259',
    'Disney: A Goofy Movie Game': '358026',
    'Citadels': '205398',
    'Bonsai': '366994',
    'Heat: Pedal to the Metal': '366013',
    'Cubitos': '298069',
    'Modern Art': '118',
    'Wingspan': '266192',
    'Wondrous Creatures': '400366'
}

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
                    let XMLResponse = await makeHTTPSRequest('/search/', {query: game.replaceAll(' ', '+'), type: 'boardgame', exact: 1});
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

    console.log('gameVersions');
    console.log(gameVersions);
    if(gameVersions.length > 1){
        gameVersions = gameVersions.sort((a, b) => {

            let yearPublishedA = a.elements.find(element => {return element.name === 'yearpublished'})
            console.log(yearPublishedA);
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

        try{
            let dataString = '';
            const req = https.get(options, function(res) {
                console.log(res.statusCode);
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    console.error(`Request Failed. Status Code: ${res.statusCode}`);
                }
                res.on('data', chunk => {
                    dataString += chunk;
                });
                res.on('end', () => {
                    resolve(dataString);
                });
            });
            
            req.on('error', (e) => {
                console.error(e);
                reject(e);
            });
        }catch(error){
            console.log(error);
            reject(error);
        }
    })

    return response;
}


module.exports = getBoardGameInfo;