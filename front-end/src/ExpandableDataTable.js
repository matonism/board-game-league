import React, { useState } from "react";

const ExpandableDataTable = props => {
        
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

    function getFieldValueFromString(obj, strValue){
        let returnValue = obj;
        strValue.split('.').forEach(field => {
            returnValue = returnValue[field];
        });
        return returnValue;
    }

    function getHeaderColumns(columnInfo){
        return columnInfo.map((column) => {
            return <div className={"historical-cell header-cell " + column.columnClass} key={'header' + column.sortField + props.variant} onClick={() => {dataSort(props.data, column.sortField)}}>{column.label}</div>
        })
    }
    function getValueColumns(player, columnInfo){
        return columnInfo.map((column) => {
           return <div className={"historical-cell " + column.columnClass} key={'value' + column.sortField + props.variant} >{getFieldValueFromString(player, column.sortField)}</div>
        })
    }
    function getGamesPlayed(){
        let rows = [];

        rows.push(
            <div key="header-historical-row" className={"historical-row header-row " + props.variant}>
                {getHeaderColumns(props.columnSchema)}
            </div>
        );

        rows = rows.concat(data.map((player, index) => {
            let playerId = player.name + props.variant;
            return (
                <div key={player.name + '-historical-row-container'} className={"historical-row-container " + props.variant + " row-container-" + ((index % 2) + 1)  + ' ' + ((playerId === openedDrawerPlayer) ? 'active' : '')}>
                    <div key={player.name + 'historical-row'} className={"historical-row " + props.variant} onClick={() => {playerId === openedDrawerPlayer ? setOpenedDrawerPlayer(null) : setOpenedDrawerPlayer(playerId)}}>
                        {getValueColumns(player, props.columnSchema)}
                    </div>
                    {props.getSubtable(player)}
                </div>
            )
        }))

        return rows;

    }

    function displayPanelContents(){
        if(data){
            return (
                <div className="table-container">
                    <div className="historical-data-section-header">{props.header}</div>
                    {getGamesPlayed()}
                </div>
            );
        }
    }

    return displayPanelContents();
}

export default ExpandableDataTable;
