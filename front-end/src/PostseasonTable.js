import React, { useState } from "react";
import HeadToHeadTable from "./HeadToHeadTable";

const PostseasonTable = props => {
        
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

    function getPostSeasonGamesPlayed(){
        let rows = [];

        rows.push(
            <div key="header-historical-row" className="historical-row postseason header-row">
                <div className="historical-cell header-cell first-column" onClick={() => {dataSort(props.data, 'name')}}>Player</div>
                <div className="historical-cell header-cell" onClick={() => {dataSort(props.data, 'championships')}}>Championships</div>
                <div className="historical-cell header-cell" onClick={() => {dataSort(props.data, 'championshipAppearances')}}>Championship Appearances</div>
                <div className="historical-cell header-cell second-column" onClick={() => {dataSort(props.data, 'playoffAppearances')}}>Playoff Appearances</div>
            </div>
        );

        rows = rows.concat(data.map((player, index) => {
            let playerId = player.name + 'postseason';
            return (
                <div key={player.name + '-historical-row-container'} className={"historical-row-container postseason row-container-" + ((index % 2) + 1)  + ' ' + ((playerId === openedDrawerPlayer) ? 'active' : '')}>
                    <div key={player.name + 'historical-row'} className="historical-row postseason" onClick={() => {playerId === openedDrawerPlayer ? setOpenedDrawerPlayer(null) : setOpenedDrawerPlayer(playerId)}}>
                        <div className="historical-cell first-column" >{player.name}</div>
                        <div className="historical-cell third-column">{player.championships}</div>
                        <div className="historical-cell third-column">{player.championshipAppearances}</div>
                        <div className="historical-cell second-column">{player.playoffAppearances}</div>
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
                    <div className="historical-data-section-header">Post Season Performance</div>
                    {getPostSeasonGamesPlayed(data.postSeason)}
                </div>
            );
        }
    }

    return displayPanelContents();
}

export default PostseasonTable;
