import React from "react";
import './PowerRankings.css';
import loadingIcon from './images/loading-icon.gif';


class PowerRankings extends React.Component {

    constructor(props){
        super(props);
        
        this.accountInfoNavRef = React.createRef();
        this.state = {
            week: 0,
        };

        this.getPowerRankingsScreen = this.getPowerRankingsScreen.bind(this);
        this.loadingScreen = this.loadingScreen.bind(this); 
        this.toggleActiveWeek = this.toggleActiveWeek.bind(this); 
    }

    componentDidMount(){
        if(this.props.powerRankings){
            this.setState({
                week: this.props.powerRankings.length - 1
            });
        }
    }

    displayWeekToggle(){
        if(this.props.powerRankings.length > 1){
            let rows = this.props.powerRankings.map((week, index) => {
                let className = "week-toggle-button";
                if(this.state.week == index){
                    className += " active";
                }
                return (<div className={className} data-name={index} key={week.label} onClick={this.toggleActiveWeek}>{week.label}</div>)
            })
            return (
                <div className="week-toggle-container">
                    {rows}
                </div>
            )
        }
    }

    toggleActiveWeek(event){
        let clickedWeek = event.target.dataset.name;
        this.setState({week: clickedWeek});
    }

    loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    displayPowerRankings(){
        
        if(this.props.powerRankings){
            let tableRows = this.props.powerRankings[this.state.week].rankings.map((value, index) => {
                return (
                    <tr className="bgl-row">
                        <td className="bgl-power-cell">{index + 1}</td>
                        <td className="bgl-power-cell">{value}</td>
                    </tr>
                )
            });

            return (
                <>
                    <div className="power-ranking-header">BGL {this.props.season} Power Rankings</div>
                    <div className="bgl-table-container">
                        <table className="bgl-table">{tableRows}</table>
                    </div>
                </>
            );
        }
    }


    getPowerRankingsScreen(){
        if(this.props.powerRankings){
            let display = [this.displayWeekToggle(), this.displayPowerRankings()];
            return display;
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
