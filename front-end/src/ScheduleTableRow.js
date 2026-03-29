import { useState } from "react";
import DetailPanel from "./DetailPanel";
import Calendar from "./Calendar";


const ScheduleTableRow = props => {
    let [displaySchedule, setDisplaySchedule] = useState(false);
    let group = props.group;

    
    function closeScheduler(){
        setDisplaySchedule(false);
    }
    function openScheduler(){
        setDisplaySchedule(true);
    }

    function getScheduleUI(){
        let startingDate = props.week.dates?.split('-').length > 1 ? new Date(props.week.dates.split('-')[0].trim() + '/' + props.season) : null;

        if(displaySchedule && startingDate){
            return (
                <DetailPanel key={props.week.week + '-' + props.index} headerText={props.week.week + ' / Group ' + (props.index + 1)} alignment="center" showClose="true" hideFooter="true" shouldDisplay={displaySchedule} closePanel={closeScheduler}>
                    <Calendar season={props.season} week={props.week} group={group} startingDate={startingDate}></Calendar>
                </DetailPanel>
            );
        }
    }

    function getTableCells(){
        let cells = [];
        for(let i = 0; i < group.length; i++){
            cells.push(<td className="bgl-table-cell">{group[i].sub ? group[i].player + ' (' + group[i].sub + ')' : group[i].player}</td>);
        }
        return cells;
    }

    function getPlacementCells(){
        let cells = [];
        for(let i = 0; i < group.length; i++){
            cells.push(<td className="bgl-table-placement-cell">{group[i].placement}</td>);
        }
        return cells;
    }

    return (
        <>
            <tbody key={"table-" + props.index}>
                <tr key={"player-row-" + props.index} className="bgl-table-row player-row">
                    <td className="bgl-table-title-cell">
                        <div data-name={props.index} onClick={openScheduler}>Group {props.index + 1}</div>
                    </td>
                    {getTableCells()}
                </tr>
                <tr  key={"place-row-" + props.index} className="bgl-table-row placement-row">
                    <td className="bgl-table-subtitle-cell">Placement</td>
                    {getPlacementCells()}
                </tr>
            </tbody>
            {getScheduleUI()}

        </>
    )
}

export default ScheduleTableRow;