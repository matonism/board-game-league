import React from "react";
import './PowerRankings.css';
import loadingIcon from './images/loading-icon.gif';


class PowerRankings extends React.Component {

    constructor(props){
        super(props);
        
        this.accountInfoNavRef = React.createRef();
        this.state = {};

        this.getPowerRankingsScreen = this.getPowerRankingsScreen.bind(this);
        this.loadingScreen = this.loadingScreen.bind(this);  
    }

    componentDidMount(){
    }


    loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    displayPowerRankings(){
        
        if(this.props.powerRankings){
            let tableRows = this.props.powerRankings.values.map((value, index) => {
                return (
                    <tr className="bgl-row">
                        <td className="bgl-power-cell">{index + 1}</td>
                        <td className="bgl-power-cell">{value}</td>
                    </tr>
                )
            });

            return (
                <>
                    <div className="power-ranking-header">BGL Power Rankings</div>
                    <div className="bgl-table-container">
                        <table className="bgl-table">{tableRows}</table>
                    </div>
                </>
            );
        }
    }


    getPowerRankingsScreen(){
        if(this.props.powerRankings){
            return this.displayPowerRankings();
        }else if(this.props.error){
            return (<div>There was an error loading the powerRankings</div>)
        }else{
            return this.loadingScreen();
        }
    }

    render(){

    
        return (
            <>
                {this.getPowerRankingsScreen()}
            </>
        );
    }
}

export default PowerRankings;
