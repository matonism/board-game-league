import React from "react";
import './Standings.css';
import loadingIcon from './images/loading-icon.gif';
import { getStandingsChartData } from "./utilities/chartDataFormatHelper";
import HighlightLineChart from "./HighlightLineChart";


class Standings extends React.Component {


    constructor(props){
        super(props);
        
        this.accountInfoNavRef = React.createRef();
        this.state = {
            chartData: null
        };

        this.getStandingsScreen = this.getStandingsScreen.bind(this);
        this.loadingScreen = this.loadingScreen.bind(this);  
    }

    componentDidMount(){
        if(this.props.standings && this.props.standings.regularSeason.length > 0){
            this.setState({chartData: getStandingsChartData(this.props.standings)})
        }
    }


    loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    displayChart(){
        if(this.props.standings && this.state.chartData){
            return (
                <div className="chart-container">
                    <div className="power-ranking-header">Points Tracker</div>
                    <HighlightLineChart chartData={this.state.chartData}></HighlightLineChart>
                </div>
            )
        }
    }

    displayStandings(){
        
        if(this.props.standings){
            let tableRows = this.props.standings.regularSeason.map((value, index) => {
                return (
                    <tr key={"bgl-row-" + index} className="bgl-row">
                        <td className="bgl-standings-cell">{value.placement}</td>
                        <td className="bgl-standings-cell">{value.player}</td>
                        <td className="bgl-standings-cell">{value.points}</td>
                    </tr>
                )
            });

            tableRows.unshift((
                <tr key='bgl-table-header'>
                    <td className="standings-row-header">Position</td>
                    <td className="standings-row-header">Player</td>
                    <td className="standings-row-header">Points</td>
                </tr>
            ))

            return (
                <>
                    {this.displayChampionship()}
                    <div className="power-ranking-header">BGL {this.props.season} Regular Season</div>
                    <div className="bgl-table-container">
                        
                        <table className="bgl-table">
                            <tbody>
                                {tableRows}
                            </tbody>
                        </table>
                    </div>
                </>
            );
        }
    }

    displayChampionship(){
        if(this.props.standings){
            let championshipRows = [];
            if(this.props.standings.championship && this.props.standings.championship.length > 0){
                championshipRows = this.props.standings.championship.map((value, index) => {
                    return (
                        <tr key={"bgl-champ-row-" + index} className="bgl-row">
                            <td className="bgl-standings-cell">{value.placement}</td>
                            <td className="bgl-standings-cell">{value.player}</td>
                            <td className="bgl-standings-cell">{value.points}</td>
                        </tr>
                    )
                });
    
                championshipRows.unshift((<tr key="champ-header">
                    <td className="standings-row-header">Position</td>
                    <td className="standings-row-header">Player</td>
                    <td className="standings-row-header">Points</td>
                </tr>))

                return (<>
                    <div className="power-ranking-header">BGL {this.props.season} Final Standings</div>
                    <div className="bgl-table-container">
                        <table className="bgl-table">
                            <tbody>
                                {championshipRows}
                            </tbody>
                        </table>
                    </div>
                </>)

            }
        }
        return (<></>);
    }


    displayStrengthOfSchedule(){
        
        if(this.props.strengthOfSchedules){
            let tableRows = this.props.strengthOfSchedules.map((value, index) => {
                return (
                    <tr key={"sos-row-" + index} className="bgl-row">
                        <td className="bgl-standings-cell">{value.placement}</td>
                        <td className="bgl-standings-cell">{value.player}</td>
                        <td className="bgl-standings-cell">{Math.round(value.strengthOfSchedule * 1000) / 1000}</td>
                    </tr>
                )
            });

            tableRows.unshift((<tr key="sos-row-header">
                <td className="standings-row-header">Position</td>
                <td className="standings-row-header">Player</td>
                <td className="standings-row-header">Avg opp. PPG</td>
            </tr>))

            return (
                <>
                    <div className="power-ranking-header">BGL {this.props.season} Strength of Schedule</div>
                    <div className="bgl-table-container">
                        <table className="bgl-table">
                            <tbody>{tableRows}</tbody>
                        </table>
                    </div>
                </>
            );
        }
    }
    getStandingsScreen(){
        if(this.props.standings?.regularSeason){
            return this.displayStandings();
        }else if(this.props.error){
            if(this.props.error.message){
                return (<div>{this.props.error.message}</div>)
            }
            return (<div>There was an error loading the standings</div>)
        }else{
            return this.loadingScreen();
        }
    }

    getStrengthOfScheduleScreen(){
        if(this.props.strengthOfSchedules){
            return this.displayStrengthOfSchedule();
        }else if(this.props.error){
            if(this.props.error.message){
                return (<div>{this.props.error.message}</div>)
            }
            return (<div>There was an error loading the strength of schedule</div>)
        }else{
            return this.loadingScreen();
        }
        
    }

    render(){

    
        return (
            <>
                {this.getStandingsScreen()}
                {this.displayChart()}
                {this.getStrengthOfScheduleScreen()}
            </>
        );
    }
}

export default Standings;
