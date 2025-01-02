import React from "react";
import './Schedule.css';
import loadingIcon from './images/loading-icon.gif';
import openNewTab from './images/open-new-tab-icon.png'
import ScheduleTableRow from "./ScheduleTableRow";


class Schedule extends React.Component {

    constructor(props){
        super(props);
        
        this.accountInfoNavRef = React.createRef();
        this.state = {};

        this.getScheduleScreen = this.getScheduleScreen.bind(this);
        this.loadingScreen = this.loadingScreen.bind(this);  
        this.displayOpenNewPageLink = this.displayOpenNewPageLink.bind(this);
    }

    componentDidMount(){
    }


    loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    displaySchedule(){
        // console.log(this.props.schedule);
        if(this.props.schedule){
            let scheduleDisplay = this.props.schedule.map((week, index) => {
                let linkDisplay = this.displayOpenNewPageLink(week.game)
                return (
                    <div key={this.props.season + index} className="bgl-week-container">
                        <div className="bgl-week-header">
                            <div>{week.week + ' - ' + week.game}</div>
                            {linkDisplay}
                        </div>
                        <div className="bgl-week-subheader">{week.dates}</div>
                        <div className="bgl-week-table-container">
                        <table className="bgl-week-table" cellPadding="0" cellSpacing="0">
                                {this.getSingleScheduleTable(week)}
                        </table>
                        </div>        
                    </div>
                )
            });

            
            return scheduleDisplay;
        }

        return (<div>could not load schedule</div>);
    }

    getSingleScheduleTable(week){
        return week.results.map((group, index) => {
            return (
                <ScheduleTableRow key={'group-' + index} week={week} group={group} season={this.props.season} index={index}></ScheduleTableRow>
            )
        })
    }

    getScheduleScreen(){
        if(this.props.schedule && this.props.schedule.length > 0){
            return (<div>{this.displaySchedule()}</div>)
        }else if(this.props.error){
            if(this.props.error.message){
                return (<div>{this.props.error.message}</div>)
            }
            return (<div>There was an error loading the schedule</div>)
        }else{
            return this.loadingScreen();
        }
    }

    displayOpenNewPageLink(game){
        let link = <></>;
        if(this.props?.boardGameHyperlinkMap){
            if(this.props?.boardGameHyperlinkMap[game]){
                let boardGameId = this.props?.boardGameHyperlinkMap[game];
                link = (<div className="bgg-link-container"><a target="_blank" rel="noreferrer" href={'https://boardgamegeek.com/boardgame/' + boardGameId}><img className="bgg-link" src={openNewTab} alt="opentab"/></a></div>)
            } 
        }
        return link;
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
