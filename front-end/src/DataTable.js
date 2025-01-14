import React, { useEffect, useRef, useState } from "react";
// import './DataTable.css';
import loadingIcon from './images/loading-icon.gif';
import { getHistoricalData } from "./callouts/CalloutFactory";
import Constants from "./Constants";
import { useQuery } from "@tanstack/react-query";
import { createHistoricalDataObject } from "./DataFormatter";

const DataTable = props => {
        
    const [data, setData] = useState(props.data);

    function dataSort(tableData, fieldName){
        setData(tableData.sort((a, b) => {
            if(a[fieldName] > b.name[fieldName]){
                return -1;
            }else{
                return 1;
            }
        }))
    }

    function getPostSeasonGamesPlayed(data){
        let rows = [];

        rows.push(
            <div key="header-historical-row" className="historical-row postseason header-row">
                <div className="historical-cell header-cell first-column" onClick={() => {dataSort(data.postSeason, 'name')}}>Player</div>
                <div className="historical-cell header-cell" onClick={() => {dataSort(data.postSeason, 'championships')}}>Championships</div>
                <div className="historical-cell header-cell" onClick={() => {dataSort(data.postSeason, 'championshipAppearances')}}>Championship Appearances</div>
                <div className="historical-cell header-cell second-column" onClick={() => {dataSort(data.postSeason, 'playoffAppearances')}}>Playoff Appearances</div>
            </div>
        );

        rows = rows.concat(data.map((player, index) => {
            let playerId = player.name + 'postseason';
            return (
                <div className={"historical-row-container postseason row-container-" + ((index % 2) + 1)  + ' ' + ((playerId == openedDrawerPlayer) ? 'active' : '')}>
                    <div key={player.name + 'historical-row'} className="historical-row postseason" onClick={() => {playerId === openedDrawerPlayer ? setOpenedDrawerPlayer(null) : setOpenedDrawerPlayer(playerId)}}>
                        <div className="historical-cell first-column" >{player.name}</div>
                        <div className="historical-cell third-column">{player.championships}</div>
                        <div className="historical-cell third-column">{player.championshipAppearances}</div>
                        <div className="historical-cell second-column">{player.playoffAppearances}</div>
                    </div>
                    {getHeadToHeadMatchups(player)}
                </div>
            )
        }))

        return rows;

    }

    function getGamesPlayed(data){
        let rows = [];

        rows.push(
            <div key="header-historical-row" className="historical-row header-row">
                <div className="historical-cell header-cell first-column">Player</div>
                <div className="historical-cell header-cell second-column">Ave. Placement</div>
                <div className="historical-cell header-cell">Firsts</div>
                <div className="historical-cell header-cell">Seconds</div>
                <div className="historical-cell header-cell">Thirds</div>
                <div className="historical-cell header-cell">Fourths</div>
                <div className="historical-cell header-cell third-column">Total Games</div>
            </div>
        );

        rows = rows.concat(data.map((player, index) => {
            let playerId = player.name + 'regular';

            return (
                <div className={"historical-row-container row-container-" + ((index % 2) + 1)  + ' ' + ((playerId == openedDrawerPlayer) ? 'active' : '')}>
                    <div key={player.name + 'historical-row'} className="historical-row" onClick={() => {playerId === openedDrawerPlayer ? setOpenedDrawerPlayer(null) : setOpenedDrawerPlayer(playerId)}}>
                        <div className="historical-cell first-column" >{player.name}</div>
                        <div className="historical-cell second-column">{Math.round(player.averagePosition * 100) / 100 }</div>
                        <div className="historical-cell">{player.placements.first}</div>
                        <div className="historical-cell">{player.placements.second}</div>
                        <div className="historical-cell">{player.placements.third}</div>
                        <div className="historical-cell">{player.placements.fourth}</div>
                        <div className="historical-cell third-column">{player.gamesPlayed}</div>
                    </div>
                    {getHeadToHeadMatchups(player)}
                </div>
            )
        }))

        return rows;
    }

    function getHeadToHeadMatchups(player){
        let rows = [];

            rows.push(<div className="head-to-head-header">Head to Head Data</div>)
            rows.push(
                <div key="header-historical-row" className="historical-row header-row">
                    <div className="historical-cell header-cell first-column">Opponent</div>
                    <div className="historical-cell header-cell second-column">Games Played</div>
                    <div className="historical-cell header-cell">Wins</div>
                    <div className="historical-cell header-cell">Losses</div>
                    <div className="historical-cell header-cell third-column">Win Rate</div>
                </div>
            );

            let dataRows = player.headToHead.map((matchup, index) => {
                return (<div key={player.name + '-vs-' + matchup.name + 'historical-row'} className={"historical-row row-" + ((index % 2) + 1)}>
                    <div className="historical-cell first-column">{matchup.name}</div>
                    <div className="historical-cell second-column">{matchup.gamesPlayed}</div>
                    <div className="historical-cell">{matchup.wins}</div>
                    <div className="historical-cell">{matchup.losses}</div>
                    <div className="historical-cell third-column">{Math.round(matchup.winRate * 100) + '%' }</div>

                </div>)
            })

            rows = rows.concat(dataRows);

        return (<div data-player={player.name} className={"head-to-head-container "}>{rows}</div>);
    }

    function displayPanelContents(){
        if(historicalDataResponse.isFetching){
            return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
        }else if(historicalDataResponse.isError){
            return (<div className="historical-data-container">Something went wrong. Try again later</div>)
        }else if(historicalData){
            return (<div className="historical-data-container">
                <div className="historical-data-section-header">Regular Season Performance</div>
                {getGamesPlayed(historicalData.regularSeason)}
                <div className="historical-data-section-header">Post Season Performance</div>
                {getPostSeasonGamesPlayed(historicalData.postSeason)}
                {/* {getHeadToHeadMatchups()} */}
                {/* TODO: Add in head to head matchups */}
            </div>)
        }
    }

    return displayPanelContents();
}

export default DataTable;
