import React from "react";
import './Schedule.css';
import loadingIcon from './images/loading-icon.gif';


class Schedule extends React.Component {

    constructor(props){
        super(props);
        
        this.accountInfoNavRef = React.createRef();
        this.state = {};

        this.getScheduleScreen = this.getScheduleScreen.bind(this);
        this.loadingScreen = this.loadingScreen.bind(this);  
    }

    componentDidMount(){
    }


    loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    displaySchedule(){
        console.log(this.props.schedule);
        if(this.props.schedule){
            let scheduleDisplay = this.props.schedule.map(week => {
                return (<>
                    <div className="bgl-week-container">
                        <div className="bgl-week-header">{week.week + ' - ' + week.game}</div>
                        <div className="bgl-week-subheader">{week.dates}</div>
                        <div className="bgl-week-table-container">
                        <table className="bgl-week-table" cellPadding="0" cellspacing="0">
                            {this.getSingleScheduleTable(week)}
                        </table>
                        </div>        
                    </div>
                </>

                )
            });

            
            return scheduleDisplay;
        }

        return (<div>could not load schedule</div>);
    }

    getSingleScheduleTable(week){
        return week.results.map((group, index) => {
            return (
                <>
                    <tr className="bgl-table-row player-row">
                        <td className="bgl-table-title-cell">Group {index + 1}</td>
                        <td className="bgl-table-cell">{group[0].player}</td>
                        <td className="bgl-table-cell">{group[1].player}</td>
                        <td className="bgl-table-cell">{group[2].player}</td>
                        <td className="bgl-table-cell">{group[3].player}</td>
                    </tr>
                    <tr className="bgl-table-row placement-row">
                        <td className="bgl-table-subtitle-cell">Placement</td>
                        <td className="bgl-table-placement-cell">{group[0].placement}</td>
                        <td className="bgl-table-placement-cell">{group[1].placement}</td>
                        <td className="bgl-table-placement-cell">{group[2].placement}</td>
                        <td className="bgl-table-placement-cell">{group[3].placement}</td>
                    </tr>
                </>
            )
        })
    }

    getScheduleScreen(){
        if(this.props.schedule){
            return (<div>{this.displaySchedule()}</div>)
        }else if(this.props.error){
            return (<div>There was an error loading the schedule</div>)
        }else{
            return this.loadingScreen();
        }
    }

    render(){

    
        return (
            <>
                {this.getScheduleScreen()}
            </>
        );
    }
}

export default Schedule;
