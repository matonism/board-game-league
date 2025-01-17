import React, { useState } from "react";
import HeadToHeadTable from "./HeadToHeadTable";

const RegularSeasonTable = props => {
        
    const [data, setData] = useState(props.data);
    const [openedDrawerPlayer, setOpenedDrawerPlayer] = useState(null);
    const [sortedFieldName, setSortedFieldName] = useState(null);
    const [sortDirection, setSortDirection] = useState(null);

    
    function dataSort(tableData, fieldName){

        let direction = fieldName === 'name' ? 'ASC' : 'DESC';
        if(sortedFieldName === fieldName){
            if(sortDirection === direction && sortDirection === 'DESC'){
                direction = 'ASC';
            }else if(sortDirection === direction && sortDirection === 'ASC'){
                direction = 'DESC';
            }
        }

        let sortedData = [...tableData].sort((a, b) => {
            let aValue = a;
            let bValue = b;
            fieldName.split('.').forEach(field => {
                aValue = aValue[field];
                bValue = bValue[field];
            });

            if(aValue > bValue){
                return direction === 'DESC' ? -1 : 1;
            }else{
                return direction === 'DESC' ? 1 : -1;
            }
        });

        setData(sortedData);
        setSortDirection(direction);
        setSortedFieldName(fieldName);
    }
    function getGamesPlayed(){
        let rows = [];

        rows.push(
            <div key="header-historical-row" className="historical-row regularSeason header-row">
                <div className="historical-cell header-cell first-column" onClick={() => {dataSort(props.data, 'name')}}>Player</div>
                <div className="historical-cell header-cell second-column" onClick={() => {dataSort(props.data, 'averagePosition')}}>Ave. Placement</div>
                <div className="historical-cell header-cell" onClick={() => {dataSort(props.data, 'placements.first')}}>Firsts</div>
                <div className="historical-cell header-cell" onClick={() => {dataSort(props.data, 'placements.second')}}>Seconds</div>
                <div className="historical-cell header-cell" onClick={() => {dataSort(props.data, 'placements.third')}}>Thirds</div>
                <div className="historical-cell header-cell" onClick={() => {dataSort(props.data, 'placements.fourth')}}>Fourths</div>
                <div className="historical-cell header-cell third-column" onClick={() => {dataSort(props.data, 'gamesPlayed')}}>Total Games</div>
            </div>
        );

        rows = rows.concat(data.map((player, index) => {
            let playerId = player.name + 'regularSeason';
            return (
                <div key={player.name + '-historical-row-container'} className={"historical-row-container regularSeason row-container-" + ((index % 2) + 1)  + ' ' + ((playerId === openedDrawerPlayer) ? 'active' : '')}>
                    <div key={player.name + 'historical-row'} className="historical-row regularSeason" onClick={() => {playerId === openedDrawerPlayer ? setOpenedDrawerPlayer(null) : setOpenedDrawerPlayer(playerId)}}>
                        <div className="historical-cell first-column" >{player.name}</div>
                        <div className="historical-cell second-column">{Math.round(player.averagePosition * 100) / 100 }</div>
                        <div className="historical-cell">{player.placements.first}</div>
                        <div className="historical-cell">{player.placements.second}</div>
                        <div className="historical-cell">{player.placements.third}</div>
                        <div className="historical-cell">{player.placements.fourth}</div>
                        <div className="historical-cell third-column">{player.gamesPlayed}</div>
                    </div>
                    {<HeadToHeadTable player={player}></HeadToHeadTable>}
                </div>
            )
        }))

        return rows;

    }

    function displayPanelContents(){
        if(data){
            return (
                <div>
                    <div className="historical-data-section-header">Regular Season Performance</div>
                    {getGamesPlayed(data.regularSeason)}
                </div>
            );
        }
    }

    return displayPanelContents();
}

export default RegularSeasonTable;
