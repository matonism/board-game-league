import React from "react";
// import InputBox from './InputBox';
import Constants from "./Constants";
import './DataContainer.css';
import loadingIcon from './images/loading-icon.gif';
import {getPowerRankings, getSchedule } from "./callouts/CalloutFactory";
import Schedule from "./Schedule";
import Standings from "./Standings";
import Results from "./Results";
import PowerRankings from "./PowerRankings";
import Album from "./Album";
import { createScheduleObject, createStandingsObject, createStrengthOfScheduleObject, getPowerRankingsObjects, createBoardGameHyperlinkMap } from "./DataFormatter";

class DataContainer extends React.Component {

    constructor(props){
        super(props);
        

        this.displayTabsRef = React.createRef();     
        this.seasonToggleRef = React.createRef();   
        this.state = {
            isLoading: true,
            schedule: [],
            results: {},
            powerRankings: [],
            standings: {},
            album: [],
            strengthOfSchedules: [],
            boardGameHyperlinkMap: {},
            displayedScreen: 'schedule',
            season: 2023,
            errors:{
                schedule: null,
                results: null,
                powerRankings: null,
                standings: null,
                album: null,
                strengthOfSchedules: null
            }
        };

        // this.loadSchedule = this.loadSchedule.bind(this);
        // this.loadPowerRankings = this.loadPowerRankings.bind(this);
        // this.loadResults = this.loadResults.bind(this);
        // this.loadStandings = this.loadStandings.bind(this);
        // this.getCurrentDisplay = this.getCurrentDisplay.bind(this);
        this.toggleDisplay = this.toggleDisplay.bind(this);
        this.toggleSeason = this.toggleSeason.bind(this);
           
    }

    componentDidMount(){
        this.loadNewSeason(this.state.season).then(() => {
            this.setState({isLoading: false})
        });
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
    async loadSchedule(season){
        
        return new Promise((resolve, reject) => {

            getSchedule(season).then(response => {

                if(response.code === 400){
                    let responseError = this.state.errors;
                    responseError.schedule = 'Schedule info do not exist for this season';
                    
                    this.setState({
                        errors: responseError,
                        schedule: null,
                        standings: null
                    });
                    console.log(response.code);
                    console.log('Could not load power rankings');
                }else{
                    let schedule = createScheduleObject(response);
                    let standings = createStandingsObject(schedule);
                    this.setState({
                        schedule: schedule,
                        standings: standings
                    });

                    let strengthOfSchedules = createStrengthOfScheduleObject(schedule, standings);
                    this.setState({
                        strengthOfSchedules: strengthOfSchedules
                    })
                    
                    this.setHyperlinkMap(schedule);
                    
                }
                resolve(response);


            }).catch(error => {
                let responseError = this.state.errors;
                responseError.schedule = error;
                this.setState({
                    errors: responseError,
                    schedule: null,
                    standings: null,
                    album: null
                });
                console.log(error.code);
                console.log('Could not load schedule');
                reject(error);
            });

        });
    }

    //static list created by admin
    loadPowerRankings(season){
        return new Promise((resolve, reject) => {

            getPowerRankings(season).then(response => {
                if(response.code === 400){
                    let responseError = this.state.errors;
                    responseError.powerRankings = 'Power Rankings do not exist for this season';

                    this.setState({
                        errors: responseError,
                        powerRankings: null
                    });
                    console.log(response.code);
                    console.log('Could not load power rankings');
                }else{
                    let powerRankings = getPowerRankingsObjects(response)
                    this.setState({
                        powerRankings: powerRankings,
                    });
                }
                resolve(response);
            }).catch(error => {
                let responseError = this.state.errors;
                responseError.powerRankings = error;
                this.setState({
                    errors: responseError,
                    powerRankings: null
                });
                console.log(error.code);
                console.log('Could not load power rankings');
                reject(error);
            });
        });

    }

    async setHyperlinkMap(schedule){
        let boardGameHyperlinkMap = await createBoardGameHyperlinkMap(schedule);
        this.setState({boardGameHyperlinkMap: boardGameHyperlinkMap});
    }
    getCurrentDisplay(){
        if(this.state.isLoading){
            return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
        }else if(this.state.displayedScreen === 'schedule'){
            return (<Schedule schedule={this.state.schedule} boardGameHyperlinkMap={this.state.boardGameHyperlinkMap} error={this.state.errors.schedule}></Schedule>);
        } else if(this.state.displayedScreen === 'powerRankings'){
            return (<PowerRankings season={this.state.season} powerRankings={this.state.powerRankings} error={this.state.errors.powerRankings}></PowerRankings>);
        } else if(this.state.displayedScreen === 'results'){
            return (<Results schedule={this.state.schedule} error={this.state.errors.results}></Results>);
        } else if(this.state.displayedScreen === 'standings'){
            return (<Standings season={this.state.season} standings={this.state.standings} strengthOfSchedules={this.state.strengthOfSchedules} error={this.state.errors.standings}></Standings>);
        } else if(this.state.displayedScreen === 'album'){
            return (<Album season={this.state.season} schedule={this.state.schedule} error={this.state.errors.album}></Album>);
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

    getDisplayOptions(){
        let displayOptions = [];
        if(this.state.schedule){
            
            displayOptions.push((<div data-name="schedule" className="toggle-button active" onClick={this.toggleDisplay}>Schedule</div>));
            displayOptions.push((<div data-name="standings" className="toggle-button" onClick={this.toggleDisplay}>Standings</div>));
        }

        if(this.state.powerRankings){
            displayOptions.push((<div data-name="powerRankings" className="toggle-button" onClick={this.toggleDisplay}>Power Rankings</div>));
        }

        if(this.state.album){
            displayOptions.push((<div data-name="album" className="toggle-button" onClick={this.toggleDisplay}>Album</div>));
        }
        return displayOptions;
    }

    toggleSeason(event){
        let buttonName = event.target.dataset.name;

        let seasonTabs = this.seasonToggleRef.current.querySelectorAll('.season-button');
        seasonTabs.forEach((tab) => {
            if(tab.className.includes(' active')){
                tab.className = tab.className.replace(' active', '');
            }
      
            if(tab.dataset.name === buttonName){
                tab.className += ' active';
            }
        });

        let previouslySelectedSeason = this.state.season;
        if(buttonName != previouslySelectedSeason){
            
            this.setState({
                isLoading: true,
                season: buttonName,
                schedule: [],
                powerRankings: [],
                standings: [],
                strengthOfSchedules: []
            })
            this.loadNewSeason(buttonName).then(() => {
                this.setState({isLoading: false});
            })
        }
        

    }

    async loadNewSeason(buttonName){
        let [scheduleResponse, powerRankingsResponse] = await Promise.all([this.loadSchedule(buttonName), this.loadPowerRankings(buttonName)]);
    }
    render(){

        return (
            <>
            <div className="season-toggle" ref={this.seasonToggleRef}>
                <div data-name="2023" className="season-button active" onClick={this.toggleSeason}>2023</div>
                <div data-name="2022" className="season-button" onClick={this.toggleSeason}>2022</div>
            </div>
            <div className="bgl-header">Board Game League</div>
            <div className="display-tabs" ref={this.displayTabsRef}>
                {this.getDisplayOptions()}
            </div>
            {this.getCurrentDisplay()}                
            </>
        );
    }
}

export default DataContainer;
