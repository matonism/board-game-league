import React, { useEffect, useRef, useState } from "react";
// import InputBox from './InputBox';
import './DataContainer.css';
import loadingIcon from './images/loading-icon.gif';
import {getPowerRankings, getSchedule } from "./callouts/CalloutFactory";
import Schedule from "./Schedule";
import Standings from "./Standings";
import Results from "./Results";
import PowerRankings from "./PowerRankings";
import Album from "./Album";
import { createScheduleObject, createStandingsObject, createStrengthOfScheduleObject, getPowerRankingsObjects, createBoardGameHyperlinkMap } from "./DataFormatter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setActiveTabClass } from "./utilities/activeTabSelector";
import InstallInstructions from "./InstallInstructions";


//options
    //don't use state, but perform expensive data formatting on every rerender
    //use state, find a way to only set state in the scenario when useQuery response changes
        //currently, we're just clearing the state when we know we're going to run another query
        //decided to use useEffect on useQuery responses

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
    const [displayedScreen, setDisplayedScreen] = useState('schedule');

    //Toggle the default number to set the default season
    const [season, setSeason] = useState("2025");

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
        enabled: scheduleData.schdeule !== null && scheduleData.schedule !== undefined
    });

    const queryClient = useQueryClient();


    //When the displayed tab changes
    useEffect(() => {
        let displayTabs = displayTabsRef.current.querySelectorAll('.toggle-button');
        setActiveTabClass(displayTabs, displayedScreen);
    }, [displayedScreen])

    //When our Schedule callout response changes
    useEffect(() => {
        if(scheduleResponse.isSuccess){
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
    }, [scheduleResponse.status, scheduleResponse.data, scheduleResponse.error, scheduleResponse.isError, scheduleResponse.isSuccess])

    //When the Power Rankings Callout response changes
    useEffect(() => {
        if(powerRankingsResponse.isSuccess){
            if(powerRankingsResponse.data.code === 400){
                let responseError = JSON.parse(JSON.stringify(errors));
                responseError.powerRankings = 'Power Rankings do not exist for this season';
                setErrors(responseError);
                setPowerRankings(null);
                console.log(powerRankingsResponse.data.code);
                console.log('Could not load power rankings');
            }else{
                let powerRankingObjects = getPowerRankingsObjects(powerRankingsResponse.data);
                setPowerRankings(powerRankingObjects)           
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
    }, [powerRankingsResponse.status, powerRankingsResponse.data, powerRankingsResponse.error, powerRankingsResponse.isError, powerRankingsResponse.isSuccess]);


    

    function getCurrentDisplay(){
        if(scheduleResponse.isFetching || powerRankingsResponse.isFetching){
            return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
        }else if(notAvailable){
            return (<div className="coming-soon-message">{'The ' + season + ' season is coming soon!'}</div>);
        }else if(displayedScreen === 'schedule'){
            return (<Schedule season={season} schedule={scheduleData.schedule} boardGameHyperlinkMap={boardGameHyperlinkMapResponse.data} error={errors.schedule}></Schedule>);
        } else if(displayedScreen === 'powerRankings'){
            if(!powerRankings || powerRankings.length === 0){
                setDisplayedScreen('schedule');
            }
            return (<PowerRankings season={season} powerRankings={powerRankings} error={errors.powerRankings}></PowerRankings>);
        } else if(displayedScreen === 'results'){
            return (<Results season={season} schedule={scheduleData.schedule} error={errors.results}></Results>);
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

        if(powerRankings && powerRankings.length > 0){
            displayOptions.push((<div data-name="powerRankings" key="powerRankings" className={"toggle-button " + (displayedScreen === "powerRankings" ? "active": "")} onClick={toggleDisplay}>Power Rankings</div>));
        }

        if(scheduleData.schedule){
            displayOptions.push((<div data-name="album" key="album" className={"toggle-button " + (displayedScreen === "album" ? "active": "")} onClick={toggleDisplay}>Album</div>));
        }
        return displayOptions;
    }

    function toggleSeason(event){
        // const queryCache = queryClient.getQueryCache();
        // console.log(queryCache);

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
        if(buttonName !== previouslySelectedSeason){

            // setScheduleData({
            //     schedule: null,
            //     standings: null,
            //     strengthOfSchedules: null
            // });
            // setPowerRankings(null);
            // queryClient.fetchQuery(['schedule'])
            setNotAvailable(false);
            setSeason(buttonName);
        }
        

    }
   

    return (
        <>
        <div className="season-toggle" ref={seasonToggleRef}>
            <div data-name="2025" className={"season-button " + (season === '2025' ? 'active' : '')} onClick={toggleSeason}>2025</div>
            <div data-name="2024" className={"season-button " + (season === '2024' ? 'active' : '')} onClick={toggleSeason}>2024</div>
            <div data-name="2023" className={"season-button " + (season === '2023' ? 'active' : '')} onClick={toggleSeason}>2023</div>
            <div data-name="2022" className={"season-button " + (season === '2022' ? 'active' : '')} onClick={toggleSeason}>2022</div>
        </div>
        <div className="bgl-header">Board Game League</div>
        <div className="display-tabs" ref={displayTabsRef}>
            {getDisplayOptions()}
        </div>
        {getCurrentDisplay()}     
        <InstallInstructions></InstallInstructions>           
        </>
    );
    
}

export default DataContainer;