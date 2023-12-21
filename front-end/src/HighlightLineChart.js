import { useEffect, useRef, useState } from "react";
import {Chart} from "chart.js/auto";
import './HighlightLineChart.css';
import {formatChartJSObject, highlightLine} from "./utilities/highlightChartSettings";
import useTraceUpdate from "./UseTrace";

const HighlightLineChart = props => {

    const chartRef = useRef();
    const chartObj = useRef(null);

    // useTraceUpdate(props);

    // if(props.chartData){
    useEffect(() => {

        let chart = chartObj?.current;
        // if(chart){
        //     chart.destroy();
        // }
        if(!chart && props.chartData){
            const chartSetup = formatChartJSObject(props.chartData);
            if(props.reverse){
                chartSetup.options.scales.y.reverse = true;
            }
            chartObj.current = new Chart(chartRef.current, chartSetup);
            chartRef.current.onclick = function(event){
                canvasClickHandler(event, chartObj?.current);
                console.log('clicked');
            }

        }

    }, [props.chartData])




        
    // }



    // if(chart){
        return (
            <div className="chart-box">
                <canvas ref={chartRef}>Chart</canvas>
            </div>
        );
    // }

    
    function canvasClickHandler(event, chart){    
        const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if(points.length){
            highlightLine(event, chart, points[0].datasetIndex);
        }
    }
}

export default HighlightLineChart;