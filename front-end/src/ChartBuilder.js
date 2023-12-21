import { useEffect, useRef } from "react";
import {Chart} from "chart.js/auto";
// import { canvasClickHandler } from "./utilities/chartDataFormatHelper";
import './ChartBuilder.css';

const ChartBuilder = props => {

    const chartRef = useRef();

    useEffect(() => {
        const chart = new Chart(chartRef.current, props.chartData);
        // chartRef.current.onclick = function(event){
        //     canvasClickHandler(event, chart);
        //     console.log('clicked');
        // }

    }, [props.chartData])




    return (
        <div className="chart-box">
            <canvas ref={chartRef}>Chart</canvas>
        </div>
    );
}

export default ChartBuilder;