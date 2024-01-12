import colorList from "./colorList"; 

export function formatChartJSObject(params){
    const {xAxisLabels, datasets, max} = params;
    return {
        type: 'line',
        data: {
            labels: xAxisLabels,
            datasets: datasets
        },
        options: {
            maintainAspectRatio: false,
            elements:{
                point: {
                    pointStyle: false
                },
                line:{
                    tension: 0.1
                }
            },
            interaction:{
                mode: 'nearest',
                intersect: false,
            }, 
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'line',
                        font: {
                            size: 10,
                            weight: "bold",
                            family: "'LouisGeorge','Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                        },
                        boxWidth: 100,
                        sort: (a, b) => {
                            return a.text < b.text ? -1 : 1;
                        }
                        
                    },

                    align: 'center',
                    onHover: function(event, legendItem) {},
                    onClick: function(event, legendItem) {
                    highlightLine(event, this.chart, legendItem.datasetIndex)
                    }
                }
            },
            scales: {
                y: {
                    // reverse: options?.reverse ? options.reverse : false,
                    // stacked: true,
                    ticks: {
                        display: true,
                        autoSkip: false,
                        // maxTicksLimit: 5,
                        includeBounds: false,
                        // callback: function(value, index, ticks) {
                        //     value = parseInt(value);
                            
                        //     if(value === 1 || (value % 5 === 0 && value !== 0)){
                        //         return value;
                        //     }else{
                        //         return ''
                        //     }
                        // }
                        font: {
                            size: 10,
                            weight: "bold",
                            family: "'LouisGeorge','Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                        },
                        backdropColor:'rgba(255, 100, 255, 0.75)'
                    },
                    max: max ? max : datasets.length + 1,
                    min:0,
                    text: "Power Rankings"

                },
                x: {
                    ticks: {
                        font: {
                            size: 10,
                            weight: "bold",
                            family: "'LouisGeorge','Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                        }
                    },

                }
            },
            aspectRatio: 0.75
        }
    }
}

    

// function randomColor() {
//     var o = Math.round, r = Math.random, s = 255;
//     let solidColor = 'rgb(' + o(r()*s) + ',' + o(r()*s) + ',' + o(r()*s) + ')';
//     let fill = 'rgba' + solidColor.substring(3, solidColor.length - 1) + ',' + 0.2 + ')';
//     return {
//         line: solidColor,
//         fill: fill
//     }
// }

export function getColor(index){
    let solidColor = colorList[index];
    let mostFill = 'rgba' + solidColor.substring(3, solidColor.length - 1) + ',' + 0.9 + ')';
    let fill = 'rgba' + solidColor.substring(3, solidColor.length - 1) + ',' + 0.2 + ')';
    return {
        line: mostFill,
        fill: fill
    }
}


export function highlightLine(event, myChart, line){
    const points = myChart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
    let clickedLines = [line];
    if(points && points.length > 0){
        clickedLines = points.map((point) => {return point.datasetIndex });
    }

    

    // selectedLine = line
    if(areClickedLinesHighlighted(clickedLines, myChart)){
        myChart.config.data.datasets.forEach((dataset, index) => {
            dataset.borderColor = getColor(index).line
            dataset.borderWidth = 3
        })
    }else{
        myChart.config.data.datasets.forEach((dataset, index) => {
            dataset.borderColor = getColor(index).fill
            dataset.borderWidth = 3
        })

        clickedLines.forEach(clickedLine => {
            myChart.config.data.datasets[clickedLine].borderWidth = 10;
            myChart.config.data.datasets[clickedLine].borderColor = getColor(clickedLine).line;
        })
    }
    myChart.update();
}

function areClickedLinesHighlighted(clickedLines, myChart){
    let areAllClickedLinesHighlighted = true;
    clickedLines.forEach(line => {
        if(myChart.config.data.datasets[line].borderWidth !== 10){
            areAllClickedLinesHighlighted = false;
        }
    });
    return areAllClickedLinesHighlighted;

}