import React, { useEffect, useState } from "react";
import './PowerRankings.css';
import loadingIcon from './images/loading-icon.gif';
// import ChartBuilder from "./ChartBuilder";
import { getPowerRankingChartData } from "./utilities/chartDataFormatHelper";
import HighlightLineChart from "./HighlightLineChart";


const PowerRankings = props => {

    //When the power rankings tab is selected - then the season changes, and then changes back, a render occurs with updated props before the state has a chance to update
    //which can lead to a week=6 while powerRankings only have 1 week of data

    const [week, setWeek] = useState(props.powerRankings ? props.powerRankings.length - 1 : 0);
    const [chartData, setChartData] = useState(getPowerRankingChartData(props.powerRankings)); 

    //if powerrankings change, update week.  This only happens after the initial render though
    //https://stackoverflow.com/questions/65979341/usestate-does-not-update-the-value-on-component-re-render
    useEffect(() => {
        setWeek(props.powerRankings.length - 1);
        setChartData(getPowerRankingChartData(props.powerRankings));
    }, [props.powerRankings])


    function displayWeekToggle(){
        if(props.powerRankings.length > 1){
            let rows = props.powerRankings.map((weekEntry, index) => {
                let className = "week-toggle-button";
                if(parseInt(week) === index){
                    className += " active";
                }
                return (<div key={weekEntry.label} className={className} data-name={index} onClick={toggleActiveWeek}>{weekEntry.label}</div>)
            })
            return (
                <div className="week-toggle-container">
                    {rows}
                </div>
            )
        }
    }

    function toggleActiveWeek(event){
        let clickedWeek = event.target.dataset.name;
        setWeek(clickedWeek);
    }

    function loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    function displayPowerRankings(){
        
        if(props.powerRankings && week < props.powerRankings.length){
            let tableRows = props.powerRankings[week].rankings.map((value, index) => {
                
                if(week > 0){
                    return (
                        <tr key={index} className="bgl-row">
                            <td className="bgl-power-cell">{index + 1}</td>
                            <td className="bgl-power-cell name-cell">{value.name}</td>
                            <td className={"bgl-power-cell " + (value.delta > 0 ? "positive" : (value.delta === 0 ? "" :  "negative"))}>{value.delta === 0 ? "" : Math.abs(value.delta)}</td>
                        </tr>
                    )

                }
                return (
                    <tr key={index} className="bgl-row">
                        <td className="bgl-power-cell">{index + 1}</td>
                        <td className="bgl-power-cell">{value.name}</td>
                    </tr>
                )
            });

            return (
                <div key="powerrankings">
                    <div  className="power-ranking-header">BGL {props.season} Power Rankings</div>
                    {displayWeekToggle()}
                    <div key="bgl-table" className="bgl-table-container">
                        <table className="bgl-table">
                            <tbody>
                                {tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
    }

    function displayChart(){
        if(props.powerRankings && chartData){
            return (
                <div key="chart-container" className="chart-container">
                    <div className="power-ranking-header">Power Rankings by Week</div>
                    <HighlightLineChart chartData={chartData} reverse="true"></HighlightLineChart>
                </div>
            )
        }
    }


    function getPowerRankingsScreen(){
        if(canDisplayWeeklyPowerRankings()){
            let display = [displayPowerRankings(), displayChart()];
            return display;
        }else if(props.error){
            if(props.error.message){
                return (<div>{props.error.message}</div>)
            }
            return (<div>There was an error loading the powerRankings</div>)
        }else{
            return loadingScreen();
        }
    }
    

    function canDisplayWeeklyPowerRankings(){
        if(props.powerRankings && props.powerRankings.length > 0 && week !== null && week >= 0 && week < props.powerRankings.length){
            return true;
        }
        return false;
    }

    
    return (
        <>
            {getPowerRankingsScreen()}
        </>
    );


}

export default PowerRankings;
