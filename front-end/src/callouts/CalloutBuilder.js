import Constants from "../Constants";
// import CookieManager from "../localstorage/CookieManager";
// let cookieManager = new CookieManager();

class CalloutBuilder {

    getLeagueData(key){
        return makeGetCallout(Constants.SERVER_URL + '/boardgameleague', {season: key}, true);
    }
    
    getSchedule(key){
        return makeGetCallout(Constants.SERVER_URL + '/schedule', {season: key}, true);
    }
    
    getPowerRankings(key){
        return makeGetCallout(Constants.SERVER_URL + '/powerRankings', {season: key}, true);
    }
    
}

function makeGetCallout(endpoint, params, isSecure){

    return new Promise((resolve, reject) => {
        
        let paramString = Object.keys(params).reduce((previous, current, index) => {
            return index === 0 ? '?' + current + '=' + params[current] : previous + '&' + current + '=' + params[current];
        }, '?');

        const url = endpoint + paramString;
        const options = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json;charset=UTF-8',
            }
        };
        
        // if(isSecure){
        //     let token = cookieManager.getValue(Constants.COOKIE_USER_KEY);
        //     if(token){
        //         options.headers['x-access-token'] = cookieManager.getValue(Constants.COOKIE_USER_KEY);
        //     }
        // }

        fetch(url, options).then(response => {
            
            if(response.ok){
                response.clone().json().then(data => {
                    console.dir(data);
                    resolve(data);
                }).catch(error => {
                    console.log(error);
                    reject(error);
                });
            }else{
                response.json().then((errorObj) => reject(errorObj));
            }
        }).catch(error => {
            console.dir(error);
            reject(error);
        });
    })
}

function makePostCallout(endpoint, body, isSecure){

    return new Promise((resolve, reject) => {

        const url = endpoint;
        const options = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json;charset=UTF-8',
            },
            body: JSON.stringify(body)
        };
        
        // if(isSecure){
        //     options.headers['x-access-token'] = cookieManager.getValue(Constants.COOKIE_USER_KEY);
        // }

        fetch(url, options).then(response => {
            if(response.ok){
                response.json().then(data => {
                    console.dir(data);
                    resolve(data);
                }).catch(error => {
                    console.log(error);
                    reject(error);
                });

            }else{
                response.json().then((errorObj) => reject(errorObj));
            }
        }).catch(error => {
            console.dir(error);
            reject(error);
        });
    })
}

function makePatchCallout(endpoint, body, isSecure){

    return new Promise((resolve, reject) => {

        const url = endpoint;
        const options = {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json;charset=UTF-8',
            },
            body: JSON.stringify(body)
        };
        
        // if(isSecure){
        //     options.headers['x-access-token'] = cookieManager.getValue(Constants.COOKIE_USER_KEY);
        // }

        fetch(url, options).then(response => {
            if(response.ok){
                response.json().then(data => {
                    console.dir(data);
                    resolve(data);
                }).catch(error => {
                    console.log(error);
                    reject(error);
                });

            }else{
                response.json().then((errorObj) => reject(errorObj));
            }
        }).catch(error => {
            console.dir(error);
            reject(error);
        });
    })
}

export default CalloutBuilder;