const { google } = require("googleapis");
const dotenv = require('dotenv');
dotenv.config();

const auth = new google.auth.GoogleAuth({
    keyFile: "./keys.json", //the key file
    scopes: "https://www.googleapis.com/auth/spreadsheets" //url to spreadsheets API
});

async function getSchedule(queryParams){
    //Auth client Object
    const authClientObject = await auth.getClient();
    const googleSheetsInstance = google.sheets({ version: "v4", auth: authClientObject });
    
    //TODO: move this env variables
    const spreadsheetId = process.env.DOCUMENT_ID;
    //Read front the spreadsheet
    const readData = await googleSheetsInstance.spreadsheets.values.get({
        auth, //auth object
        spreadsheetId, // spreadsheet id
        range: "Schedule!A:E", //range of cells to read from.
    })

    return readData.data;
}

module.exports = getSchedule;