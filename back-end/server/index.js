const dotenv = require('dotenv');
dotenv.config();
var express = require('express'); // Express web server framework
// var request = require('request'); 

var cors = require('cors');
var fs = require('fs');
var url = require('url');
var bodyParser = require('body-parser');
var getSchedule = require('./getSchedule.js');
const getPowerRankings = require('./getPowerRankings.js');
const getBoardGameInfo = require('./getBoardGameInfo.js');
const getHistoricalData = require('./getHistoricalData.js');

var app = express();
//set app view engine
app.set("view engine", "ejs");

app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(__dirname + '/../public', {index: '/../public/pages/home/home.html'}))
.use(cors());
console.log(__dirname + '/../public');

app.get('/pages/*', handleRedirect);


function handleRedirect(req, res) {

    //TODO: Make this legible
    let requestUrl = req.originalUrl.replace('%23', '#');
    let relativeLinkSplit = requestUrl.split('#');
    var isFile = true; 
    fs.stat(__dirname + '/../public' + requestUrl, function(err, stats) {
        if (stats.isDirectory()) {
            isFile = false;
        }
        
        let splitURL = relativeLinkSplit[0].split('/pages/');
        if(splitURL.length > 1){
            if(!isFile){
                console.log('Request is for directory...');
                let targetUrl = req.originalUrl + '/index.html';
                res.sendFile(targetUrl, { root: __dirname + '/../public/' });
    
            }else if(!splitURL[1].includes('.html')){
                let targetUrl = req.originalUrl + splitURL[1].split('/')[0] + '.html';
                if(relativeLinkSplit.length > 1){
                    console.log('redirecting to...');
                    targetUrl = splitURL[0] + '/pages/' + splitURL[1] + '/' +  splitURL[1].split('/')[0] + '.html#' + relativeLinkSplit[1];
                    console.log(targetUrl);
                    res.redirect(targetUrl);
                }else{
                    console.log(targetUrl);
                    res.sendFile(targetUrl, { root: __dirname + '/../public/' });
                }
            }
    
        }
    });
    
}

app.get('/schedule', (request, response) => {
    let queryParams = url.parse(request.url, true).query;
    getSchedule(queryParams).then(data => {
        response.send(data);
    }).catch(error => {
        console.log(error);
        response.status = 400;
        response.send(error);
    })
});


app.get('/powerRankings', (request, response) => {
    let queryParams = url.parse(request.url, true).query;
    getPowerRankings(queryParams).then(data => {
        response.send(data);
    }).catch(error => {
        response.status = 400;
        response.send(error);
    })
});

app.get('/boardGameIds', async (request, response) => {
    let queryParams = url.parse(request.url, true).query;
    try{
        let data = await getBoardGameInfo(queryParams);
        response.send(data);
    }catch(error){
        response.status = 400;
        response.send(error);
    }
});

app.get('/historicalData', async (request, response) => {
    let queryParams = url.parse(request.url, true).query;
    try{
        let data = await getHistoricalData(queryParams);
        response.send(data);
    }catch(error){
        response.status = 400;
        response.send(error);
    }
});

var PORT = process.env.PORT || 4001;
console.log('Listening on 4001....');
app.listen(PORT);