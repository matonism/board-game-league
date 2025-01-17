import React, { useState } from "react";

const HeadToHeadTable = props => {
        
    const [data, setData] = useState(props.player.headToHead);
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

    function getHeadToHeadMatchups(){
        let rows = [];

            rows.push(<div key={"head-to-header-" + props.player.name} className="head-to-head-header">Head to Head Data</div>)
            rows.push(
                <div key="header-historical-row" className="historical-row header-row">
                    <div className="historical-cell header-cell first-column" onClick={() => {dataSort(props.player.headToHead, 'name')}}>Opponent</div>
                    <div className="historical-cell header-cell second-column" onClick={() => {dataSort(props.player.headToHead, 'gamesPlayed')}}>Games Played</div>
                    <div className="historical-cell header-cell" onClick={() => {dataSort(props.player.headToHead, 'wins')}}>Wins</div>
                    <div className="historical-cell header-cell" onClick={() => {dataSort(props.player.headToHead, 'losses')}}>Losses</div>
                    <div className="historical-cell header-cell third-column" onClick={() => {dataSort(props.player.headToHead, 'winRate')}}>Win Rate</div>
                </div>
            );

            let dataRows = data.map((matchup, index) => {
                return (<div key={props.player.name + '-vs-' + matchup.name + 'historical-row'} className={"historical-row row-" + ((index % 2) + 1)}>
                    <div className="historical-cell first-column">{matchup.name}</div>
                    <div className="historical-cell second-column">{matchup.gamesPlayed}</div>
                    <div className="historical-cell">{matchup.wins}</div>
                    <div className="historical-cell">{matchup.losses}</div>
                    <div className="historical-cell third-column">{Math.round(matchup.winRate * 100) + '%' }</div>

                </div>)
            })

            rows = rows.concat(dataRows);

        return (<div key={props.player.name + "head-to-head-container"} data-player={props.player.name} className={"head-to-head-container "}>{rows}</div>);
    }


    return getHeadToHeadMatchups();
}

export default HeadToHeadTable;
