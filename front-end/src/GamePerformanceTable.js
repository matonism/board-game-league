import React, { useState } from "react";

const GamePerformanceTable = props => {
        
    const [data, setData] = useState(props.player.gamePerformance);
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

    function getTable(){
        let rows = [];

            rows.push(
                <div key={"header-historical-row" + props.variant} className="historical-row header-row">
                    <div className="historical-cell header-cell" onClick={() => {dataSort(props.player.gamePerformance, 'name')}}>Game</div>
                    <div className="historical-cell header-cell" onClick={() => {dataSort(props.player.gamePerformance, 'season')}}>Season</div>
                    <div className="historical-cell header-cell" onClick={() => {dataSort(props.player.gamePerformance, 'week')}}>Week</div>
                    <div className="historical-cell header-cell" onClick={() => {dataSort(props.player.gamePerformance, 'placement')}}>Placement</div>
                </div>
            );

            let dataRows = data.map((gameInfo, index) => {
                return (<div key={props.player.name + gameInfo.game + index + props.variant + '-games-played-historical-row'} className={"historical-row row-" + ((index % 2) + 1)}>
                    <div className="historical-cell">{gameInfo.game}</div>
                    <div className="historical-cell">{gameInfo.season}</div>
                    <div className="historical-cell">{gameInfo.week}</div>
                    <div className="historical-cell">{gameInfo.placement}</div>
                </div>)
            })

            rows = rows.concat(dataRows);

        return (<div key={props.player.name + "head-to-head-container"} data-player={props.player.name} className={"head-to-head-container game-performance"}>{rows}</div>);
    }


    return getTable();
}

export default GamePerformanceTable;
