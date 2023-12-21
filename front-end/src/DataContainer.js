import React, { useEffect, useRef, useState } from "react";
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
import { QueryCache, useQuery, useQueryClient } from "@tanstack/react-query";


//Run initially
//Run Query1
//Is Fetching1
//Is Success1
//Run Query2
//Is Fetching2
//Is Success2
//setState
//Set Hyperlink Map

const DataContainer = props => {

    const displayTabsRef = useRef();     
    const seasonToggleRef = useRef();

    const [scheduleData, setScheduleData] = useState({
        schedule: null,
        standings: null,
        strengthOfSchedules: null
    });
    const [powerRankings, setPowerRankings] = useState(null);
    // const [schedule, setSchedule] = useState(null);
    // const [standings, setStandings] = useState(null);
    // const [strengthOfSchedules, setStrengthOfSchedules] = useState(null);
    // const [boardGameHyperlinkMap, setBoardGameHyperlinkMap] = useState({});
    const [displayedScreen, setDisplayedScreen] = useState('schedule');
    const [season, setSeason] = useState("2023");

    const [errors, setErrors] = useState({
        schedule: null,
        results: null,
        powerRankings: null,
        standings: null,
        album: null,
        strengthOfSchedules: null
    });
    const [notAvailable, setNotAvailable] = useState(false);

    const scheduleResponse = useQuery({
        queryKey: ['schedule', season],
        queryFn: () => {
            return getSchedule(season)
        },
        staleTime: Infinity,
        keepPreviousData: true,
        retry: false
    })

    const powerRankingsResponse = useQuery({
        queryKey: ['powerRankings', season],
        queryFn: () => {
            return getPowerRankings(season)
        },
        staleTime: Infinity,
        keepPreviousData: true,
        retry: false
    });

    const boardGameHyperlinkMapResponse = useQuery({
        queryKey: ['boardGameHyperlinks', scheduleData.schedule],
        queryFn: () => {
            return createBoardGameHyperlinkMap(scheduleData.schedule)
        },
        staleTime: Infinity,
        keepPreviousData: true,
        retry: false,
        enabled: scheduleData.schdeule !== null
    });

    const queryClient = useQueryClient();


    useEffect(() => {
        let displayTabs = displayTabsRef.current.querySelectorAll('.toggle-button');
        displayTabs.forEach((tab) => {
            if(tab.className.includes(' active')){
                tab.className = tab.className.replace(' active', '');
            }
      
            if(tab.dataset.name === displayedScreen){
                tab.className += ' active';
            }
        })
    }, [displayedScreen])


    if(scheduleResponse.isSuccess && !scheduleData.schedule){
        if(scheduleResponse.data.code === 400){
            let responseError = JSON.parse(JSON.stringify(errors));
            responseError.schedule = 'Schedule info do not exist for this season';
            setErrors(responseError);
            setScheduleData({
                schedule: null,
                standings: null,
                strengthOfSchedules: null
            });
            console.log(scheduleResponse.data.code);
            console.log('Could not load schedule');
        }else{
            let scheduleObject = createScheduleObject(scheduleResponse.data);
            if(!scheduleObject){
                setNotAvailable(true);
            }else{
                let standingsObj = createStandingsObject(scheduleObject);
                setScheduleData({
                    schedule: scheduleObject,
                    standings: standingsObj,
                    strengthOfSchedules: createStrengthOfScheduleObject(scheduleObject, standingsObj)
                });
                // createHyperlinkMap(scheduleObject);
            }
        }
    }

    if(scheduleResponse.isError){
        let errorObj = JSON.parse(JSON.stringify(errors));
        errorObj.schedule = scheduleResponse.error;
        setErrors(errorObj);
        setScheduleData({
            schedule: null,
            standings: null,
            strengthOfSchedules: null
        });
        console.log(scheduleResponse.error.code);
        console.log('Could not load schedule');
    }

    if(powerRankingsResponse.isSuccess && !powerRankings){
        if(powerRankingsResponse.data.code === 400){
            let responseError = JSON.parse(JSON.stringify(errors));
            responseError.powerRankings = 'Power Rankings do not exist for this season';
            setErrors(responseError);
            setPowerRankings(null);
            console.log(powerRankingsResponse.data.code);
            console.log('Could not load power rankings');
        }else{
            setPowerRankings(getPowerRankingsObjects(powerRankingsResponse.data))           
        }
    }

    if(powerRankingsResponse.isError){
        let responseError = JSON.parse(JSON.stringify(errors));
        responseError.powerRankings = powerRankingsResponse.error;
        setErrors(responseError);
        setPowerRankings(null);
        console.log(powerRankingsResponse.error.code);
        console.log('Could not load power rankings');
    }

    // async function createHyperlinkMap(schedule){
    //     let hyperlinkMap = await createBoardGameHyperlinkMap(schedule);
    //     setBoardGameHyperlinkMap(hyperlinkMap);
    // }

    function getCurrentDisplay(){
        if(scheduleResponse.isFetching || powerRankingsResponse.isFetching){
            return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
        }else if(notAvailable){
            return (<div className="coming-soon-message">{'The ' + season + ' season is coming soon!'}</div>);
        }else if(displayedScreen === 'schedule'){
            return (<Schedule schedule={scheduleData.schedule} boardGameHyperlinkMap={boardGameHyperlinkMapResponse.data} error={errors.schedule}></Schedule>);
        } else if(displayedScreen === 'powerRankings'){
            return (<PowerRankings season={season} powerRankings={powerRankings} error={errors.powerRankings}></PowerRankings>);
        } else if(displayedScreen === 'results'){
            return (<Results schedule={scheduleData.schedule} error={errors.results}></Results>);
        } else if(displayedScreen === 'standings'){
            return (<Standings season={season} standings={scheduleData.standings} strengthOfSchedules={scheduleData.strengthOfSchedules} error={errors.standings}></Standings>);
        } else if(displayedScreen === 'album'){
            return (<Album season={season} schedule={scheduleData.schedule} error={errors.album}></Album>);
        } else {
            return (<Schedule schedule={scheduleData.schedule} error={errors.schedule}></Schedule>);
        }
            
    }

    function toggleDisplay(event){
        let buttonName = event.target.dataset.name;
        setDisplayedScreen(buttonName);
        let displayTabs = displayTabsRef.current.querySelectorAll('.toggle-button');
        displayTabs.forEach((tab) => {
            if(tab.className.includes(' active')){
                tab.className = tab.className.replace(' active', '');
            }
      
            if(tab.dataset.name === buttonName){
                tab.className += ' active';
            }
        })
    }

    function getDisplayOptions(){
        let displayOptions = [];
        if(notAvailable){
            return displayOptions;
        }
        if(scheduleData.schedule){
            
            displayOptions.push((<div data-name="schedule" key="schedule" className={"toggle-button " + (displayedScreen === "schedule" ? "active": "")} onClick={toggleDisplay}>Schedule</div>));
        }

        if(scheduleData.standings){
            displayOptions.push((<div data-name="standings" key="standings" className={"toggle-button " + (displayedScreen === "standings" ? "active": "")} onClick={toggleDisplay}>Standings</div>));
        }

        if(powerRankings){
            displayOptions.push((<div data-name="powerRankings" key="powerRankings" className={"toggle-button " + (displayedScreen === "powerRankings" ? "active": "")} onClick={toggleDisplay}>Power Rankings</div>));
        }

        if(scheduleData.schedule){
            displayOptions.push((<div data-name="album" key="album" className={"toggle-button " + (displayedScreen === "album" ? "active": "")} onClick={toggleDisplay}>Album</div>));
        }
        return displayOptions;
    }

    function toggleSeason(event){
        
        //TODO: Look into this and see why we are still making callouts event though we have items in cache
        const queryCache = queryClient.getQueryCache();
        console.log(queryCache);

        let buttonName = event.target.dataset.name;

        let seasonTabs = seasonToggleRef.current.querySelectorAll('.season-button');
        seasonTabs.forEach((tab) => {
            if(tab.className.includes(' active')){
                tab.className = tab.className.replace(' active', '');
            }
      
            if(tab.dataset.name === buttonName){
                tab.className += ' active';
            }
        });

        let previouslySelectedSeason = season;
        if(buttonName != previouslySelectedSeason){


            setScheduleData({
                schedule: null,
                standings: null,
                strengthOfSchedules: null
            });
            setPowerRankings(null);
            setNotAvailable(false);
            setSeason(buttonName);
        }
        

    }

    // async loadNewSeason(buttonName){
    //     let [scheduleResponse, powerRankingsResponse] = await Promise.all([this.loadSchedule(buttonName), this.loadPowerRankings(buttonName)]);
    // }
   

    return (
        <>
        <div className="season-toggle" ref={seasonToggleRef}>
            <div data-name="2024" className="season-button" onClick={toggleSeason}>2024</div>
            <div data-name="2023" className="season-button active" onClick={toggleSeason}>2023</div>
            <div data-name="2022" className="season-button" onClick={toggleSeason}>2022</div>
        </div>
        <div className="bgl-header">Board Game League</div>
        <div className="display-tabs" ref={displayTabsRef}>
            {getDisplayOptions()}
        </div>
        {getCurrentDisplay()}                
        </>
    );
    
}

export default DataContainer;




// class DataContainer extends React.Component {

//     constructor(props){
//         super(props);
        

//         this.displayTabsRef = React.createRef();     
//         this.seasonToggleRef = React.createRef();   
//         this.state = {
//             isLoading: true,
//             schedule: [],
//             results: {},
//             powerRankings: [],
//             standings: {},
//             album: [],
//             strengthOfSchedules: [],
//             boardGameHyperlinkMap: {},
//             displayedScreen: 'schedule',
//             season: 2023,
//             errors:{
//                 schedule: null,
//                 results: null,
//                 powerRankings: null,
//                 standings: null,
//                 album: null,
//                 strengthOfSchedules: null
//             },
//             notAvailable: false
//         };

//         // this.loadSchedule = this.loadSchedule.bind(this);
//         // this.loadPowerRankings = this.loadPowerRankings.bind(this);
//         // this.loadResults = this.loadResults.bind(this);
//         // this.loadStandings = this.loadStandings.bind(this);
//         // this.getCurrentDisplay = this.getCurrentDisplay.bind(this);
//         this.toggleDisplay = this.toggleDisplay.bind(this);
//         this.toggleSeason = this.toggleSeason.bind(this);
           
//     }

//     componentDidMount(){
//         this.loadNewSeason(this.state.season).then(() => {
//             this.setState({isLoading: false})
//         });
//     }


//     // schedule = [
//     //     {
//     //         week: 1, 
//     //         game: 'Imhotep', 
//     //         dates: '1/9-1/22', 
//     //         results: [
//     //             [
//     //                 {player: 'nick': placement: 1},
//     //                 {player:'michael': placement: 4},
//     //                 {player:'richie': placement: 2},
//     //                 {player:'luke': placement: 3}
//     //             ]
                
//     //         ], 
//     //         finished: true
//     //     }
//     //     {
//     //         week: 2,
//     //         game: 'TBD',
//     //         dates: '1/23-2/5', 
//     //         results: [{players:, ], 
//     //         finished: true
//     //     }
//     // ]
//     //static schedule (may include results here as well?)
//     async loadSchedule(season){
        
//         return new Promise((resolve, reject) => {

//             getSchedule(season).then(response => {

//                 if(response.code === 400){
//                     let responseError = this.state.errors;
//                     responseError.schedule = 'Schedule info do not exist for this season';
                    
//                     this.setState({
//                         errors: responseError,
//                         schedule: null,
//                         standings: null
//                     });
//                     console.log(response.code);
//                     console.log('Could not load power rankings');
//                 }else{
//                     let schedule = createScheduleObject(response);
//                     if(!schedule){
//                         this.setState({notAvailable: true});
//                     }else{
//                         let standings = createStandingsObject(schedule);
//                         this.setState({
//                             schedule: schedule,
//                             standings: standings
//                         });
//                         let strengthOfSchedules = createStrengthOfScheduleObject(schedule, standings);
//                         this.setState({
//                             strengthOfSchedules: strengthOfSchedules
//                         })
//                         this.setHyperlinkMap(schedule);
//                     }
                    
//                 }
//                 resolve(response);


//             }).catch(error => {
//                 let responseError = this.state.errors;
//                 responseError.schedule = error;
//                 this.setState({
//                     errors: responseError,
//                     schedule: null,
//                     standings: null,
//                     album: null
//                 });
//                 console.log(error.code);
//                 console.log('Could not load schedule');
//                 reject(error);
//             });

//         });
//     }

//     //static list created by admin
//     loadPowerRankings(season){
//         return new Promise((resolve, reject) => {

//             getPowerRankings(season).then(response => {
//                 if(response.code === 400){
//                     let responseError = this.state.errors;
//                     responseError.powerRankings = 'Power Rankings do not exist for this season';

//                     this.setState({
//                         errors: responseError,
//                         powerRankings: null
//                     });
//                     console.log(response.code);
//                     console.log('Could not load power rankings');
//                 }else{
//                     let powerRankings = getPowerRankingsObjects(response)
//                     this.setState({
//                         powerRankings: powerRankings,
//                     });
//                 }
//                 resolve(response);
//             }).catch(error => {
//                 let responseError = this.state.errors;
//                 responseError.powerRankings = error;
//                 this.setState({
//                     errors: responseError,
//                     powerRankings: null
//                 });
//                 console.log(error.code);
//                 console.log('Could not load power rankings');
//                 reject(error);
//             });
//         });

//     }

//     async setHyperlinkMap(schedule){
//         let boardGameHyperlinkMap = await createBoardGameHyperlinkMap(schedule);
//         this.setState({boardGameHyperlinkMap: boardGameHyperlinkMap});
//     }
//     getCurrentDisplay(){
//         if(this.state.isLoading){
//             return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
//         }else if(this.state.notAvailable){
//             return (<div className="coming-soon-message">{'The ' + this.state.season + ' season is coming soon!'}</div>);
//         }else if(this.state.displayedScreen === 'schedule'){
//             return (<Schedule schedule={this.state.schedule} boardGameHyperlinkMap={this.state.boardGameHyperlinkMap} error={this.state.errors.schedule}></Schedule>);
//         } else if(this.state.displayedScreen === 'powerRankings'){
//             return (<PowerRankings season={this.state.season} powerRankings={this.state.powerRankings} error={this.state.errors.powerRankings}></PowerRankings>);
//         } else if(this.state.displayedScreen === 'results'){
//             return (<Results schedule={this.state.schedule} error={this.state.errors.results}></Results>);
//         } else if(this.state.displayedScreen === 'standings'){
//             return (<Standings season={this.state.season} standings={this.state.standings} strengthOfSchedules={this.state.strengthOfSchedules} error={this.state.errors.standings}></Standings>);
//         } else if(this.state.displayedScreen === 'album'){
//             return (<Album season={this.state.season} schedule={this.state.schedule} error={this.state.errors.album}></Album>);
//         } else {
//             return (<Schedule schedule={this.state.schedule} error={this.state.errors.schedule}></Schedule>);
//         }
            
//     }

//     toggleDisplay(event){
//         let buttonName = event.target.dataset.name;
//         this.setState({
//             displayedScreen: buttonName
//         })
//         let displayTabs = this.displayTabsRef.current.querySelectorAll('.toggle-button');
//         displayTabs.forEach((tab) => {
//             if(tab.className.includes(' active')){
//                 tab.className = tab.className.replace(' active', '');
//             }
      
//             if(tab.dataset.name === buttonName){
//                 tab.className += ' active';
//             }
//         })
//     }

//     getDisplayOptions(){
//         let displayOptions = [];
//         if(this.state.notAvailable){
//             return displayOptions;
//         }
//         if(this.state.schedule){
            
//             displayOptions.push((<div data-name="schedule" className="toggle-button active" onClick={this.toggleDisplay}>Schedule</div>));
//             displayOptions.push((<div data-name="standings" className="toggle-button" onClick={this.toggleDisplay}>Standings</div>));
//         }

//         if(this.state.powerRankings){
//             displayOptions.push((<div data-name="powerRankings" className="toggle-button" onClick={this.toggleDisplay}>Power Rankings</div>));
//         }

//         if(this.state.album){
//             displayOptions.push((<div data-name="album" className="toggle-button" onClick={this.toggleDisplay}>Album</div>));
//         }
//         return displayOptions;
//     }

//     toggleSeason(event){
//         let buttonName = event.target.dataset.name;

//         let seasonTabs = this.seasonToggleRef.current.querySelectorAll('.season-button');
//         seasonTabs.forEach((tab) => {
//             if(tab.className.includes(' active')){
//                 tab.className = tab.className.replace(' active', '');
//             }
      
//             if(tab.dataset.name === buttonName){
//                 tab.className += ' active';
//             }
//         });

//         let previouslySelectedSeason = this.state.season;
//         if(buttonName != previouslySelectedSeason){
            
//             this.setState({
//                 isLoading: true,
//                 season: buttonName,
//                 schedule: [],
//                 powerRankings: [],
//                 standings: [],
//                 strengthOfSchedules: [],
//                 notAvailable: false

//             })
//             this.loadNewSeason(buttonName).then(() => {
//                 this.setState({isLoading: false});
//             })
//         }
        

//     }

//     async loadNewSeason(buttonName){
//         let [scheduleResponse, powerRankingsResponse] = await Promise.all([this.loadSchedule(buttonName), this.loadPowerRankings(buttonName)]);
//     }
//     render(){

//         return (
//             <>
//             <div className="season-toggle" ref={this.seasonToggleRef}>
//                 <div data-name="2024" className="season-button" onClick={this.toggleSeason}>2024</div>
//                 <div data-name="2023" className="season-button active" onClick={this.toggleSeason}>2023</div>
//                 <div data-name="2022" className="season-button" onClick={this.toggleSeason}>2022</div>
//             </div>
//             <div className="bgl-header">Board Game League</div>
//             <div className="display-tabs" ref={this.displayTabsRef}>
//                 {this.getDisplayOptions()}
//             </div>
//             {this.getCurrentDisplay()}                
//             </>
//         );
//     }
// }

// export default DataContainer;
