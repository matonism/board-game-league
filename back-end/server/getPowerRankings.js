const { google } = require("googleapis");
const dotenv = require('dotenv');
dotenv.config();

const auth = new google.auth.GoogleAuth({
    keyFile: "./keys.json", //the key file
    scopes: "https://www.googleapis.com/auth/spreadsheets" //url to spreadsheets API
});

async function getPowerRankings(queryParams){
    let season = queryParams.season;

    //Auth client Object
    const authClientObject = await auth.getClient();
    const googleSheetsInstance = google.sheets({ version: "v4", auth: authClientObject });
    
    //TODO: move this env variables
    //This is real live data
    // const spreadsheetId = "1DLPFwTuEH2UdI7PkHZGisB2PUCXv8xFnm_aV5q8xvLw";

    //This is test data
    const spreadsheetId = process.env.DOCUMENT_ID;
    //Read front the spreadsheet
    const readData = await googleSheetsInstance.spreadsheets.values.get({
        auth, //auth object
        spreadsheetId, // spreadsheet id
        range: "PowerRankings-" + season + "!A1:G100", //range of cells to read from.
    })

    return readData.data;
}

module.exports = getPowerRankings;