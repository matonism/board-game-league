// dependencies
const getHistoricalData = require('./getHistoricalData.js');

exports.handler = async (event) => {
    console.log(event);
    return getHistoricalData(event.queryStringParameters).then(data => {
        const response = {
            statusCode: 200,
            body: JSON.stringify(data),
        };
        return response;
    }).catch(error => {
        const response = {
            statusCode: 400,
            body: error
        }
        return response
    });
};

