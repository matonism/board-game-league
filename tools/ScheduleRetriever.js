const getSchedule = require('./getSchdule.js');
const DataFormatter = require('./utilities/DataFormatter.js');
const fileWriter = require("./utilities/fileWriter.js");

method();

async function method(){
    try{
        let data = await getHistoricalData({seasons:"2022,2023,2024,2025,2026"});
        let formattedData = DataFormatter.createHistoricalDataObject(data);
        fileWriter.createFile('output/', 'historicalData', 'json', JSON.stringify(formattedData));
        // console.log(formattedData);
        console.log('success');
    }catch(error){
        console.log('error');
        console.log(error);
    }
}