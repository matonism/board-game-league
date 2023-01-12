// dependencies
const getPowerRankings = require('./getPowerRankings.js');

exports.handler = async (event) => {
    console.log(event);
    return getPowerRankings(event.queryStringParameters).then(schedule => {
        const response = {
            statusCode: 200,
            body: JSON.stringify(schedule),
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

