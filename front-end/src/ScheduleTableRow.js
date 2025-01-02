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
        let startingDate = props.week.dates.split('-').length > 1 ? new Date(props.week.dates.split('-')[0].trim() + '/' + props.season) : null;

        if(displaySchedule && startingDate){
            return (
                <DetailPanel key={props.week.week + '-' + props.index} headerText={props.week.week + ' / Group ' + (props.index + 1)} alignment="center" showClose="true" hideFooter="true" shouldDisplay={displaySchedule} closePanel={closeScheduler}>
                    <Calendar season={props.season} week={props.week} group={group} startingDate={startingDate}></Calendar>
                </DetailPanel>
            );
        }
    }

    return (
        <>
            <tbody key={"table-" + props.index}>
                <tr key={"player-row-" + props.index} className="bgl-table-row player-row">
                    <td className="bgl-table-title-cell">
                        <div data-name={props.index} onClick={openScheduler}>Group {props.index + 1}</div>
                    </td>
                    <td className="bgl-table-cell">{group[0].player}</td>
                    <td className="bgl-table-cell">{group[1].player}</td>
                    <td className="bgl-table-cell">{group[2].player}</td>
                    <td className="bgl-table-cell">{group[3].player}</td>
                </tr>
                <tr  key={"place-row-" + props.index} className="bgl-table-row placement-row">
                    <td className="bgl-table-subtitle-cell">Placement</td>
                    <td className="bgl-table-placement-cell">{group[0].placement}</td>
                    <td className="bgl-table-placement-cell">{group[1].placement}</td>
                    <td className="bgl-table-placement-cell">{group[2].placement}</td>
                    <td className="bgl-table-placement-cell">{group[3].placement}</td>
                </tr>
            </tbody>
            {getScheduleUI()}

        </>
    )
}

export default ScheduleTableRow;