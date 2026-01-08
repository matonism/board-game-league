const { google } = require("googleapis");
const dotenv = require('dotenv');
dotenv.config();

const auth = new google.auth.GoogleAuth({
    keyFile: "./keys.json", //the key file
    scopes: "https://www.googleapis.com/auth/spreadsheets" //url to spreadsheets API
});

async function getHistoricalData(queryParams){
    let seasons = queryParams.seasons;
    console.log(seasons);
    
    //Auth client Object
    const authClientObject = await auth.getClient();
    const googleSheetsInstance = google.sheets({ version: "v4", auth: authClientObject });
    const spreadsheetId = process.env.DOCUMENT_ID;
    
    let sheetRanges = seasons.split(',').map(season => {
        return "Schedule-" + season + "!A:E";
    });

    // const sheets = await 
    const readData = await googleSheetsInstance.spreadsheets.values.batchGet({
        auth, //auth object
        spreadsheetId, // spreadsheet id
        ranges: sheetRanges, //range of cells to read from.
    });

    return readData.data;
}

module.exports = getHistoricalData;