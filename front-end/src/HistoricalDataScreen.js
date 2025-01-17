import React, { useEffect, useState } from "react";
import './HistoricalDataScreen.css';
import loadingIcon from './images/loading-icon.gif';
import { getHistoricalData } from "./callouts/CalloutFactory";
import Constants from "./Constants";
import { useQuery } from "@tanstack/react-query";
import { createHistoricalDataObject } from "./DataFormatter";
import PostseasonTable from "./PostseasonTable";
import RegularSeasonTable from "./RegularSeasonTable";

const HistoricalDataScreen = props => {
        
    const [historicalData, setHistoricalData] = useState(null);
    const [error, setError] = useState(null);

    const historicalDataResponse = useQuery({
        queryKey: ['historicalData'],
        queryFn: () => {
            return getHistoricalData(Constants.SEASONS)
        },
        staleTime: Infinity,
        keepPreviousData: true,
        retry: false
    })  

    //When our Schedule callout response changes
    useEffect(() => {
        if(historicalDataResponse.isSuccess){
            if(historicalDataResponse.data.code === 400){
                setError('Historical Info does not exist');
                setHistoricalData(null);
                console.log(historicalDataResponse.data.code);
                console.log('Could not load historical data');
            }else{
                let historicalDataObject = createHistoricalDataObject(historicalDataResponse.data);
                setHistoricalData(historicalDataObject);
            }
        }

        if(historicalDataResponse.isError){
            setError(historicalDataResponse.error);
            setHistoricalData(null);
            console.log(historicalDataResponse.error.code);
            console.log('Could not load schedule');
        }
    }, [historicalDataResponse.status, historicalDataResponse.data, historicalDataResponse.error, historicalDataResponse.isError, historicalDataResponse.isSuccess])


    function displayPanelContents(){
        if(historicalDataResponse.isFetching){
            return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
        }else if(historicalDataResponse.isError){
            console.log(error);
            return (<div className="historical-data-container">Something went wrong. Try again later</div>)
        }else if(historicalData){
            return (<div className="historical-data-container">
                <RegularSeasonTable data={historicalData.regularSeason}></RegularSeasonTable>
                <PostseasonTable data={historicalData.postSeason}></PostseasonTable>
            </div>)
        }
    }

    return displayPanelContents();
}

export default HistoricalDataScreen;
