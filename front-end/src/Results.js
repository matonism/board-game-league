import React from "react";
import './Results.css';
import loadingIcon from './images/loading-icon.gif';


class Results extends React.Component {

    constructor(props){
        super(props);
        
        this.accountInfoNavRef = React.createRef();
        this.state = {};

        this.getResultsScreen = this.getResultsScreen.bind(this);
        this.loadingScreen = this.loadingScreen.bind(this);  
    }

    componentDidMount(){
    }


    loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }


    getResultsScreen(){
        if(this.props.results){
            return (<div>Showing results table</div>)
        }else if(this.props.error){
            if(this.props.error.message){
                return (<div>{this.props.error.message}</div>)
            }
            return (<div>There was an error loading the results</div>)
        }else{
            return this.loadingScreen();
        }
    }

    render(){

    
        return (
            <>
                {this.getResultsScreen()}
            </>
        );
    }
}

export default Results;
