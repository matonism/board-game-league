// dependencies
const getSchedule = require('./getSchedule.js');

exports.handler = async (event) => {
    console.log(event);
    return getSchedule(event.queryStringParameters).then(schedule => {
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

