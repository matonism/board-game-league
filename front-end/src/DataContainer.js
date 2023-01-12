import React from "react";
// import InputBox from './InputBox';
import Constants from "./Constants";
import './DataContainer.css';
import loadingIcon from './images/loading-icon.gif';
import {getPowerRankings, getSchedule, getStandings, getResults } from "./callouts/CalloutFactory";
import Schedule from "./Schedule";
import Standings from "./Standings";
import Results from "./Results";
import PowerRankings from "./PowerRankings";

class DataContainer extends React.Component {

    constructor(props){
        super(props);
        

        this.displayTabsRef = React.createRef();        
        this.state = {
            isLoading: true,
            schedule: [],
            results: {},
            powerRankings: {},
            standings: {},
            displayedScreen: 'schedule',
            errors:{
                schedule: null,
                results: null,
                powerRankings: null,
                standings: null
            }
        };

        this.loadSchedule = this.loadSchedule.bind(this);
        this.loadPowerRankings = this.loadPowerRankings.bind(this);
        this.loadResults = this.loadResults.bind(this);
        this.loadStandings = this.loadStandings.bind(this);
        this.getCurrentDisplay = this.getCurrentDisplay.bind(this);
        this.toggleDisplay = this.toggleDisplay.bind(this);
           
    }

    componentDidMount(){
        this.loadSchedule();
        this.loadPowerRankings();
        // this.loadResults();
        // this.loadStandings();
    }


    // schedule = [
    //     {
    //         week: 1, 
    //         game: 'Imhotep', 
    //         dates: '1/9-1/22', 
    //         results: [
    //             [
    //                 {player: 'nick': placement: 1},
    //                 {player:'michael': placement: 4},
    //                 {player:'richie': placement: 2},
    //                 {player:'luke': placement: 3}
    //             ]
                
    //         ], 
    //         finished: true
    //     }
    //     {
    //         week: 2,
    //         game: 'TBD',
    //         dates: '1/23-2/5', 
    //         results: [{players:, ], 
    //         finished: true
    //     }
    // ]
    //static schedule (may include results here as well?)
    loadSchedule(){
        getSchedule().then(response => {
            let schedule = this.createScheduleObject(response);
            let standings = this.createStandingsObject(schedule);

        }).catch(error => {
            let responseError = this.state.errors;
            responseError.schedule = error;
            this.setState({
                errors: responseError
            });
            if(error.code){
                console.log(error.code);
                console.log('Could not load schedule');
            }
        });
    }

    //static list created by admin
    loadPowerRankings(){
        getPowerRankings().then(response => {
            this.setState({
                powerRankings: response,
            });
        }).catch(error => {
            let responseError = this.state.errors;
            responseError.powerRankings = error;
            this.setState({
                errors: responseError
            });
            if(error.code){
                console.log(error.code);
                console.log('Could not load power rankings');
            }
        });

    }

    //get 1st place - 4th place for each already played game
    loadResults(){
        getResults().then(response => {
            this.setState({
                results: response,
            });
        }).catch(error => {
            let responseError = this.state.error;
            responseError.results = error;
            this.setState({
                error: responseError
            });
            if(error.code){
                console.log(error.code);
                console.log('Could not load results');
            }
        });

    }

    //current point totals (might not need.  Can probably just retrieve results and run logic)
    loadStandings(){
        getStandings().then(response => {
            this.setState({
                standings: response,
            });
        }).catch(error => {
            let responseError = this.state.error;
            responseError.standings = error;
            this.setState({
                error: responseError
            });
            if(error.code){
                console.log(error.code);
                console.log('Could not load standings');
            }
        });

    }

   createScheduleObject(response){
            let numberOfGamesPerWeek = 4;
            let numberOfPlayersPerGame = 4;
            let infoHeaderRows = 1;
            let rowsBetweenWeeksInSpreadsheet = numberOfGamesPerWeek * 2 + infoHeaderRows;
            
            let schedule = [];
            response.values.forEach((row, rowIndex) => {
                
                let rowReference = rowIndex % rowsBetweenWeeksInSpreadsheet;
                if(rowReference == 0){
                    schedule.push({
                        week: row[0], 
                        game: row[1], 
                        dates: row[2], 
                        results: []});
                }else if(rowReference % 2 === 1){
                    let placementRow = response.values[rowIndex + 1];
                    let scheduleToUpdate = schedule[schedule.length - 1];
                    scheduleToUpdate.results.push([]);
                    for(let j = 1; j <= numberOfPlayersPerGame; j++){
                        let groupToUpdate = scheduleToUpdate.results[scheduleToUpdate.results.length-1];
                        let placement = placementRow[j];
                        groupToUpdate.push({player: row[j], placement: placement})
                    }
                }
            })
            this.setState({
                schedule: schedule,
            });
            return schedule;
   }

   createStandingsObject(schedule){
        let standings = {};
        schedule.forEach(week=>{
            week.results.forEach(group => {
                group.forEach(performance => {
                    if(!standings[performance.player]){
                        standings[performance.player] = 0;
                    }
                    if(performance.placement){
                        standings[performance.player] += this.scoringRubric(performance.placement);
                    }
                })
            })
        })
        
        let standingsArray = Object.keys(standings).map(player => {
            return {player: player, points: standings[player]};
        })


        standingsArray.sort((a, b) => {
            if(a.points > b.points) {
                return -1;
            }else{
                return 1;
            }
        })

        this.setState({
            standings: standingsArray
        })

        return standingsArray;
   }

   scoringRubric(placement){
    if(placement == 1){
        return 3;
    }else if(placement == 2){
        return 2;
    }else if(placement == 3){
        return 1;
    }
    return 0;
   }

    getCurrentDisplay(){
        if(this.state.displayedScreen === 'schedule'){
            return (<Schedule schedule={this.state.schedule} error={this.state.errors.schedule}></Schedule>);
        } else if(this.state.displayedScreen === 'powerRankings'){
            return (<PowerRankings powerRankings={this.state.powerRankings} error={this.state.errors.powerRankings}></PowerRankings>);
        } else if(this.state.displayedScreen === 'results'){
            return (<Results schedule={this.state.schedule} error={this.state.errors.results}></Results>);
        } else if(this.state.displayedScreen === 'standings'){
            return (<Standings standings={this.state.standings} error={this.state.errors.standings}></Standings>);
        } else {
            return (<Schedule schedule={this.state.schedule} error={this.state.errors.schedule}></Schedule>);
        }
            
    }

    toggleDisplay(event){
        let buttonName = event.target.dataset.name;
        this.setState({
            displayedScreen: buttonName
        })
        let displayTabs = this.displayTabsRef.current.querySelectorAll('.toggle-button');
        displayTabs.forEach((tab) => {
            if(tab.className.includes(' active')){
                tab.className = tab.className.replace(' active', '');
            }
      
            if(tab.dataset.name === buttonName){
                tab.className += ' active';
            }
        })
    }

    render(){

        return (
            <>
            <div className="bgl-header">Board Game League</div>
            <div className="display-tabs" ref={this.displayTabsRef}>
                <div data-name="schedule" className="toggle-button active" onClick={this.toggleDisplay}>Schedule</div>
                <div data-name="standings" className="toggle-button" onClick={this.toggleDisplay}>Standings</div>
                <div data-name="powerRankings" className="toggle-button" onClick={this.toggleDisplay}>Power Rankings</div>
            </div>
            {this.getCurrentDisplay()}                
            </>
        );
    }
}

export default DataContainer;
