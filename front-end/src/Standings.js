import React from "react";
import './Standings.css';
import loadingIcon from './images/loading-icon.gif';


class Standings extends React.Component {


    constructor(props){
        super(props);
        
        this.accountInfoNavRef = React.createRef();
        this.state = {};

        this.getStandingsScreen = this.getStandingsScreen.bind(this);
        this.loadingScreen = this.loadingScreen.bind(this);  
    }

    componentDidMount(){
    }


    loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    displayStandings(){
        
        if(this.props.standings){
            let tableRows = this.props.standings.regularSeason.map((value, index) => {
                return (
                    <tr className="bgl-row">
                        <td className="bgl-standings-cell">{value.placement}</td>
                        <td className="bgl-standings-cell">{value.player}</td>
                        <td className="bgl-standings-cell">{value.points}</td>
                    </tr>
                )
            });

            tableRows.unshift((<tr>
                <td className="standings-row-header">Position</td>
                <td className="standings-row-header">Player</td>
                <td className="standings-row-header">Points</td>
            </tr>))

            return (
                <>
                    {this.displayChampionship()}
                    <div className="power-ranking-header">BGL {this.props.season} Regular Season</div>
                    <div className="bgl-table-container">
                        <table className="bgl-table">{tableRows}</table>
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
                        <tr className="bgl-row">
                            <td className="bgl-standings-cell">{index + 1}</td>
                            <td className="bgl-standings-cell">{value.player}</td>
                            <td className="bgl-standings-cell">{value.points}</td>
                        </tr>
                    )
                });
    
                championshipRows.unshift((<tr>
                    <td className="standings-row-header">Position</td>
                    <td className="standings-row-header">Player</td>
                    <td className="standings-row-header">Points</td>
                </tr>))

                return (<>
                    <div className="power-ranking-header">BGL {this.props.season} Final Standings</div>
                    <div className="bgl-table-container">
                        <table className="bgl-table">{championshipRows}</table>
                    </div>
                </>)

            }
        }
        return (<></>);
    }

    getStandingsScreen(){
        if(this.props.standings?.regularSeason){
            return this.displayStandings();
        }else if(this.props.error){
            return (<div>There was an error loading the standings</div>)
        }else{
            return this.loadingScreen();
        }
    }

    render(){

    
        return (
            <>
                {this.getStandingsScreen()}
            </>
        );
    }
}

export default Standings;
