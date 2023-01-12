import CalloutBuilder from "./CalloutBuilder";

class CalloutBuilderMock extends CalloutBuilder{

    getLeagueData(key){
        return new Promise((resolve, reject) => {
            resolve ({"data": "data"})
        })
    }

    getSchedule(key){
        return new Promise((resolve, reject) => {
            resolve ({"data": "data"})
        })
    }

    getPowerRankings(key){
        return new Promise((resolve, reject) => {
            resolve ({"data": "data"})
        })
    }

}

export default CalloutBuilderMock;