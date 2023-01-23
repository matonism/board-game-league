import CalloutBuilder from "./CalloutBuilder";

class CalloutBuilderMock extends CalloutBuilder{

    getLeagueData(key){
        return new Promise((resolve, reject) => {
            resolve ({"data": "data"})
        })
    }

    getSchedule(key){
        return new Promise((resolve, reject) => {
            resolve (
                {
                    
                    majorDimension: "ROWS",
                    range: "'Schedule-2023'!A1:E1000",
                    values: [
                        ['Week 1', 'Imhotep', '01/09 - 01/22'],
                        ['Group 1', 'Michael', 'Richie', 'Nick', 'Luke'],
                        ['Placing', '4', '2', '1', '3'],
                        ['Group 2', 'Ashley', 'Allie', 'Rachel F', 'Carly'],
                        ['Placing', '1', '4', '3', '2'],
                        ['Group 3', 'Austin', 'Dan', 'Tyler', 'Jack'],
                        ['Placing', '1', '2', '4', '3'],
                        ['Group 4', 'Josh', 'Ryan', 'Rachel M', 'Steve'],
                        ['Placing', '4', '3', '1', '2'],
                        ['Week 2', 'Carcassonne', '01/23 - 02/05'],
                        ['Group 1', 'Rachel M', 'Richie', 'Austin', 'Allie'],
                        ['Placing'],
                        ['Group 2', 'Steve', 'Tyler', 'Dan', 'Luke'],
                        ['Placing'],
                        ['Group 3', 'Michael', 'Ashley', 'Ryan', 'Jack'],
                        ['Placing'],
                        ['Group 4', 'Carly', 'Rachel F', 'Nick', 'Josh'],
                        ['Placing'],
                        ['Week 3', 'TBD', '02/06 - 02/19'],
                        ['Group 1', 'Rachel M', 'Michael', 'Rachel F', 'Ryan'],
                        ['Placing'],
                        ['Group 2', 'Steve', 'Ashley', 'Carly', 'Austin'],
                        ['Placing'],
                        ['Group 3', 'Tyler', 'Richie', 'Josh', 'Luke'],
                        ['Placing'],
                        ['Group 4', 'Jack', 'Nick', 'Dan', 'Allie'],
                        ['Placing'],
                        ['Week 4', 'TBD', '02/20 - 03/05'],
                        ['Group 1', 'Rachel M', 'Jack', 'Ashley', 'Nick'],
                        ['Placing'],
                        ['Group 2', 'Steve', 'Richie', 'Dan', 'Rachel F'],
                        ['Placing'],
                        ['Group 3', 'Tyler', 'Josh', 'Michael', 'Austin'],
                        ['Placing'],
                        ['Group 4', 'Allie', 'Luke', 'Carly', 'Ryan'],
                        ['Placing'],
                        ['Week 5', 'TBD', '03/06 - 03/19'],
                        ['Group 1', 'Rachel M', 'Richie', 'Ashley', 'Dan'],
                        ['Placing'],
                        ['Group 2', 'Steve', 'Michael', 'Tyler', 'Luke'],
                        ['Placing'],
                        ['Group 3', 'Rachel F', 'Jack', 'Ryan', 'Nick'],
                        ['Placing'],
                        ['Group 4', 'Allie', 'Carly', 'Josh', 'Austin'],
                        ['Placing'],
                        ['Week 6', 'TBD', '03/20 - 04/02'],
                        ['Group 1', 'Rachel M', 'Steve', 'Jack', 'Michael'],
                        ['Placing'],
                        ['Group 2', 'Dan', 'Carly', 'Nick', 'Austin'],
                        ['Placing'],
                        ['Group 3', 'Allie', 'Ryan', 'Josh', 'Luke'],
                        ['Placing'],
                        ['Group 4', 'Rachel F', 'Ashley', 'Tyler', 'Richie'],
                        ['Placing']
                    ]
                }
            )

        })
    }

    getPowerRankings(key){
        return new Promise((resolve, reject) => {
            resolve (
                {
                    majorDimension: "ROWS",
                    range: "'PowerRankings-2023'!A1:G100",
                    values: [
                        ['Preseason', 'Week 1'],
                        ['Michael', 'Nick'],
                        ['Nick', 'Richie'],
                        ['Richie', 'Rachel M'],
                        ['Luke', 'Austin'],
                        ['Dan', 'Ashley'],
                        ['Austin', 'Dan'],
                        ['Ryan', 'Carly'],
                        ['Rachel F', 'Steve'],
                        ['Allie', 'Ryan'],
                        ['Rachel M', 'Rachel F'],
                        ['Ashley', 'Luke'],
                        ['Steve', 'Jack'],
                        ['Tyler', 'Tyler'],
                        ['Jack', 'Allie'],
                        ['Carly', 'Michael'],
                        ['Josh', 'Josh']
                    ]
                }
            )

        })
    }

}

export default CalloutBuilderMock;