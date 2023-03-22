// dependencies
const getBoardGameInfo = require('./getBoardGameInfo.js');

exports.handler = async (event) => {
    try{
        let data = await getBoardGameInfo(event.queryStringParameters);  
        const response = {
            statusCode: 200,
            body: JSON.stringify(data)
        };
        return response;
    }catch(error){
        const response = {
            statusCode: 400,
            body: error
        }
        return response;
    }
};

