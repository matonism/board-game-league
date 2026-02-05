import React, { useEffect, useState } from "react";
import './HistoricalDataScreen.css';
import loadingIcon from './images/loading-icon.gif';
import { getHistoricalData } from "./callouts/CalloutFactory";
import Constants from "./Constants";
import { useQuery } from "@tanstack/react-query";
import { createHistoricalDataObject } from "./DataFormatter";
import ExpandableDataTable from "./ExpandableDataTable";
import GamePerformanceTable from "./GamePerformanceTable";
import RegularSeasonPerformanceColumns from "./RegularSeasonPerformanceColumns";
import PostseasonPerformanceColumns from "./PostseasonPerformanceColumns";
import HeadToHeadTable from "./HeadToHeadTable";
import MatchupAnalyticsColumns from "./MatchupAnalyticsColumns";

const HistoricalDataScreen = props => {
        
    const [historicalData, setHistoricalData] = useState(null);
    const [error, setError] = useState(null);

    const historicalDataResponse = useQuery({
        queryKey: ['historicalData'],
        queryFn: () => {
            return getHistoricalData(Constants.SEASONS)
        },
        staleTime: Infinity,
        keepPreviousData: true,
        retry: false
    })  

    //When our Schedule callout response changes
    useEffect(() => {
        if(historicalDataResponse.isSuccess){
            if(historicalDataResponse.data.code === 400){
                setError('Historical Info does not exist');
                setHistoricalData(null);
                console.log(historicalDataResponse.data.code);
                console.log('Could not load historical data');
            }else{
                let historicalDataObject = createHistoricalDataObject(historicalDataResponse.data);
                setHistoricalData(historicalDataObject);
            }
        }

        if(historicalDataResponse.isError){
            setError(historicalDataResponse.error);
            setHistoricalData(null);
            console.log(historicalDataResponse.error.code);
            console.log('Could not load schedule');
        }
    }, [historicalDataResponse.status, historicalDataResponse.data, historicalDataResponse.error, historicalDataResponse.isError, historicalDataResponse.isSuccess])


    function displayPanelContents(){
        if(historicalDataResponse.isFetching){
            return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
        }else if(historicalDataResponse.isError){
            console.log(error);
            return (<div className="historical-data-container">Something went wrong. Try again later</div>)
        }else if(historicalData){
            return (<div className="historical-data-container">

                <ExpandableDataTable 
                    header="Regular Season Performance" 
                    variant="regularSeason" 
                    columnSchema={RegularSeasonPerformanceColumns} 
                    data={historicalData.regularSeason}
                    getSubtable={(player) => <GamePerformanceTable variant="regular-season-game-perf" player={player}></GamePerformanceTable>
                    }
                ></ExpandableDataTable>

                <ExpandableDataTable 
                    header="Postseason Performance" 
                    variant="postseason" 
                    columnSchema={PostseasonPerformanceColumns} 
                    data={historicalData.postSeason}
                    getSubtable={(player) => <GamePerformanceTable variant="postseason-game-perf" player={player}></GamePerformanceTable>}
                ></ExpandableDataTable>

                <ExpandableDataTable 
                    header="Regular Season Matchup Analytics" 
                    variant="matchup-analytics" 
                    columnSchema={MatchupAnalyticsColumns} 
                    data={historicalData.regularSeason}
                    getSubtable={(player) => <HeadToHeadTable variant="regular-season-head-to-head" player={player}></HeadToHeadTable>}
                ></ExpandableDataTable>

                <ExpandableDataTable 
                    header="Postseason Matchup Analytics" 
                    variant="matchup-analytics" 
                    columnSchema={MatchupAnalyticsColumns} 
                    data={historicalData.postSeason}
                    getSubtable={(player) => <HeadToHeadTable variant="postseason-head-to-head" player={player}></HeadToHeadTable>}
                ></ExpandableDataTable>

                <a href="https://bglcompanion.com/analysis" className="no-underline">
                    <div className="historical-data-button-container">
                        <div className="historical-data-button">Leaderboards</div>
                    </div>
                </a>
                <a href="https://bglcompanion.com/weeklyReport" className="no-underline">
                    <div className="historical-data-button-container">
                        <div className="historical-data-button">Weekly Report</div>
                    </div>
                </a>
            </div>)
        }
    }

    return displayPanelContents();
}

export default HistoricalDataScreen;
