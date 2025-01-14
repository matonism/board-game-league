import React, { useEffect, useState } from "react";
import './Standings.css';
import loadingIcon from './images/loading-icon.gif';
import { getStandingsChartData } from "./utilities/chartDataFormatHelper";
import HighlightLineChart from "./HighlightLineChart";
import DetailPanel from "./DetailPanel";
import HistoricalDataScreen from "./HistoricalDataScreen";
import { freezeBody, unfreezeBody } from "./utilities/domUtilities";

const Standings = props => {

    const [chartData, setChartData] = useState(null);
    const [showHistoricalData, setShowHistoricalData] = useState(false);

    useEffect(() => {
        if(props.standings && props.standings.regularSeason.length > 0){
            setChartData(getStandingsChartData(props.standings));
        }
    }, [props.standings])
    // componentDidMount(){
        // if(props.standings && props.standings.regularSeason.length > 0){
        // }
    // }
    
    // componentDidUpdate(prevProps, prevState) {
    // useEffect
        // if (prevProps.standings !== props.standings) {
        //     setChartData(getStandingsChartData(props.standings));
        // }
    // }



    function loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    function displayChart(){
        if(props.standings && chartData){
            return (
                <div className="chart-container">
                    <div className="power-ranking-header">Points Tracker</div>
                    <HighlightLineChart chartData={chartData}></HighlightLineChart>
                </div>
            )
        }
    }

    function displayStandings(){
        
        if(props.standings){
            let tableRows = props.standings.regularSeason.map((value, index) => {
                return (
                    <tr key={"bgl-row-" + index} className="bgl-row">
                        <td className="bgl-standings-cell">{value.placement}</td>
                        <td className="bgl-standings-cell">{value.player}</td>
                        <td className="bgl-standings-cell">{value.points}</td>
                    </tr>
                )
            });

            tableRows.unshift((
                <tr key='bgl-table-header'>
                    <td className="standings-row-header">Position</td>
                    <td className="standings-row-header">Player</td>
                    <td className="standings-row-header">Points</td>
                </tr>
            ))

            return (
                <>
                    {displayChampionship()}
                    <div className="power-ranking-header">BGL {props.season} Regular Season</div>
                    <div className="bgl-table-container">
                        
                        <table className="bgl-table">
                            <tbody>
                                {tableRows}
                            </tbody>
                        </table>
                    </div>
                </>
            );
        }
    }

    function displayChampionship(){
        if(props.standings){
            let championshipRows = [];
            if(props.standings.championship && props.standings.championship.length > 0){
                championshipRows = props.standings.championship.map((value, index) => {
                    return (
                        <tr key={"bgl-champ-row-" + index} className="bgl-row">
                            <td className="bgl-standings-cell">{value.placement}</td>
                            <td className="bgl-standings-cell">{value.player}</td>
                            <td className="bgl-standings-cell">{value.points}</td>
                        </tr>
                    )
                });
    
                championshipRows.unshift((<tr key="champ-header">
                    <td className="standings-row-header">Position</td>
                    <td className="standings-row-header">Player</td>
                    <td className="standings-row-header">Points</td>
                </tr>))

                return (<>
                    <div className="power-ranking-header">BGL {props.season} Final Standings</div>
                    <div className="bgl-table-container">
                        <table className="bgl-table">
                            <tbody>
                                {championshipRows}
                            </tbody>
                        </table>
                    </div>
                </>)

            }
        }
        return (<></>);
    }


    function displayStrengthOfSchedule(){
        
        if(props.strengthOfSchedules){
            let tableRows = props.strengthOfSchedules.map((value, index) => {
                return (
                    <tr key={"sos-row-" + index} className="bgl-row">
                        <td className="bgl-standings-cell">{value.placement}</td>
                        <td className="bgl-standings-cell">{value.player}</td>
                        <td className="bgl-standings-cell">{Math.round(value.strengthOfSchedule * 1000) / 1000}</td>
                    </tr>
                )
            });

            tableRows.unshift((<tr key="sos-row-header">
                <td className="standings-row-header">Position</td>
                <td className="standings-row-header">Player</td>
                <td className="standings-row-header">Avg opp. PPG</td>
            </tr>))

            return (
                <>
                    <div className="power-ranking-header">BGL {props.season} Strength of Schedule</div>
                    <div className="bgl-table-container">
                        <table className="bgl-table">
                            <tbody>{tableRows}</tbody>
                        </table>
                    </div>
                </>
            );
        }
    }
    function getStandingsScreen(){
        if(props.standings?.regularSeason){
            return displayStandings();
        }else if(props.error){
            if(props.error.message){
                return (<div>{props.error.message}</div>)
            }
            return (<div>There was an error loading the standings</div>)
        }else{
            return loadingScreen();
        }
    }

    function getStrengthOfScheduleScreen(){
        if(props.strengthOfSchedules){
            return displayStrengthOfSchedule();
        }else if(props.error){
            if(props.error.message){
                return (<div>{props.error.message}</div>)
            }
            return (<div>There was an error loading the strength of schedule</div>)
        }else{
            return loadingScreen();
        }
        
    }


    function showHistoricalDataButton(){
        return (
            <div className="historical-data-button-container">
                <div className="historical-data-button" onClick={() => {setShowHistoricalData(true); freezeBody();}}>View Historical Data</div>
            </div>
        )
    }
    
    function historicalDataDisplay(){
        //props: alignment, closePanel, showClose, showBack, headerText, hideFooter, shouldDisplay

            return (
                <DetailPanel headerText="Historical Data" showClose="true" hideFooter="true" showBack="true" shouldDisplay={showHistoricalData} closePanel={() => {setShowHistoricalData(false); unfreezeBody()}}>
                    <HistoricalDataScreen></HistoricalDataScreen>
                </DetailPanel>
            )
    }

    return (
        <>
            {historicalDataDisplay()}
            {getStandingsScreen()}
            {displayChart()}
            {getStrengthOfScheduleScreen()}
            {showHistoricalDataButton()}
        </>
    );
    
}

export default Standings;
