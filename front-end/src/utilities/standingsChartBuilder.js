// import colorList from "./colorList.js";

// export function getStandingsChartData(standings){
//     let xAxisLabels;
//     let rankingData = {};
//     standings.regularSeason.forEach((player, index) => {
//         if(!xAxisLabels){
//             xAxisLabels = player.weeklyScores.map((score, index) => {
//                 return 'Week ' + (index + 1);
//             })
//         }
        
//         let runningTotal = 0;
//         player.weeklyScores.forEach((score) => {

//             const key = player.player.trim();
//             if(Object.keys(rankingData).includes(key)){
//                 rankingData[key].push(runningTotal += score);
//             }else{
//                 rankingData[key] = [runningTotal += score];
//             }
//         })


//     })
//     let defaulthighlight = Math.random() * (Object.keys(rankingData).length - 1)
//     const datasets = Object.keys(rankingData).map((name, index) => {
//         const color = getColor(index);
//         return {
//             label: name,
//             data: rankingData[name],
//             // borderWidth: 1,
//             backgroundColor: color.fill,
//             borderColor: index == defaulthighlight ? color.line : color.fill,
//             color: color.line,
//             // fill: "start",
//             borderWidth: index == defaulthighlight ? 10 : 2,
//             onClick: function(event, legendItem) {
//               highlightLine(this.chart, legendItem.datasetIndex)
//             }

//         }
//     });

//     return {datasets, xAxisLabels}
    
//     // // const datasets = Object.keys(rankingData).map((name, index) => {
//     // //     const color = getColor(index);
//     // //     return {
//     // //         label: name,
//     // //         data: rankingData[name],
//     // //         // borderWidth: 1,
//     // //         backgroundColor: color.fill,
//     // //         borderColor: color.fill,
//     // //         color: color.line,
//     // //         hoverBorderColor: color.line,
//     // //         hoverBorderWidth: 10,
//     // //         // fill: "start",
//     // //         borderWidth: 2,


//     // //     }
//     // // });
//     // // let hoveredDatasetIndex = -1
//     // return {
//     //     type: 'line',
//     //     data: {
//     //         labels: xAxisLabels,
//     //         datasets: datasets
//     //     },
//     //     options: {
//     //         elements:{
//     //             point: {
//     //                 pointStyle: false
//     //             },
//     //             line:{
//     //                 // tension: 0.1
//     //             }
//     //         },
//     //         interaction:{
//     //             mode: 'nearest',
//     //             intersect: false,
//     //         }, 
//     //         plugins: {
//     //             legend: {
//     //                 position: 'left',
//     //                 labels: {
//     //                     usePointStyle: true,
//     //                     pointStyle: 'line',
//     //                     font: {
//     //                         size: 8
//     //                     },
//     //                     // boxWidth: 20,
//     //                     sort: (a, b) => {
//     //                         return a.text < b.text ? -1 : 1;
//     //                     }
                        
//     //                 },
//     //                 align: 'start',
//     //                 onClick: highlightLegendItem,
//     //                 onHover: function(event, legendItem) {
//     //                     highlightLine(this.chart, legendItem.datasetIndex)
//     //                     // var options = this.options || {};
//     //                     // var hoverOptions = options.hover || {};
//     //                     // var ci = this.chart;
//     //                     // hoveredDatasetIndex = legendItem.datasetIndex;
//     //                     // ci.updateHoverStyle(ci.getDatasetMeta(hoveredDatasetIndex).data, hoverOptions.mode, true);
//     //                     // ci.render();
//     //                   }
//     //                 // onHover: function(event, legendItem) {
//     //                 //     var options = this.options || {};
//     //                 //     var hoverOptions = options.hover || {};
//     //                 //     var ci = this.chart;
//     //                 //     // hoveredDatasetIndex = legendItem.datasetIndex;
//     //                 //     ci.updateHoverStyle(ci.getDatasetMeta(legendItem.datasetIndex).data, hoverOptions.mode, true);
//     //                 //     ci.render();
//     //                 // }
//     //             }
//     //         },
//     //         scales: {
//     //             y: {
//     //                 // reverse: true,
//     //                 // stacked: true,
//     //                 ticks: {
//     //                     display: true,
//     //                     autoSkip: true,
//     //                     maxTicksLimit: 5,
//     //                     // includeBounds: false,
//     //                     // callback: function(value, index, ticks) {
//     //                     //     value = parseInt(value);
                            
//     //                     //     if(value === 1 || (value % 5 === 0 && value !== 0)){
//     //                     //         return value;
//     //                     //     }else{
//     //                     //         return ''
//     //                     //     }
//     //                     // }
//     //                     // font: {
//     //                     //     size: 8
//     //                     // }
//     //                 },
//     //                 max: datasets.length,
//     //                 min:0,
//     //                 text: "Power Rankings"

//     //             },
//     //             x: {
//     //                 ticks: {
//     //                     font: {
//     //                         size: 10
//     //                     }
//     //                 },

//     //             }
//     //         },
//     //         tooltips: {
//     //            mode: 'index'
//     //         },
//     //         aspectRatio: 1,
//     //         // onHover: (e, activeEls, chart) => {
//     //         //     if (activeEls.length === 0) {
//     //         //       chart.data.datasets.forEach((dataset) => {
//     //         //         dataset.backgroundColor = dataset.backgroundColor.length === 9 ? dataset.backgroundColor.slice(0, -2) : dataset.backgroundColor;
//     //         //         dataset.borderColor = dataset.borderColor.length === 9 ? dataset.borderColor.slice(0, -2) : dataset.borderColor;
//     //         //       });
//     //         //       chart.update();
//     //         //       return;
//     //         //     }
          
//     //         //     const hoveredEl = chart.getElementsAtEventForMode(e, 'point', {
//     //         //       intersect: true
//     //         //     }, true)[0]
          
//     //         //     chart.data.datasets.forEach((dataset, i) => {
//     //         //       dataset.backgroundColor = (hoveredEl.datasetIndex === i || dataset.backgroundColor.length === 9) ? dataset.backgroundColor : dataset.backgroundColor + '4D';
//     //         //       dataset.borderColor = (hoveredEl.datasetIndex === i || dataset.borderColor.length === 9) ? dataset.borderColor : dataset.borderColor + '4D';
//     //         //     });
          
//     //         //     chart.update();
//     //         //   },
//     //     }
//     // }

//     // function getColor(index){
//     //     let solidColor = colorList[index];
//     //     let fill = 'rgba' + solidColor.substring(3, solidColor.length - 1) + ',' + 0.2 + ')';
//     //     return {
//     //         line: solidColor,
//     //         fill: fill
//     //     }
//     // }


//     // function highlightLegendItem(e, legendItem, legend){
//     //     const index = legendItem.datasetIndex;
//     //     const ci = legend.chart;
//     //     if (ci.isDatasetVisible(index)) {
//     //         ci.hide(index);
//     //         legendItem.hidden = true;
//     //     } else {
//     //         ci.show(index);
//     //         legendItem.hidden = false;
//     //     }
//     // }
    

//     // function highlightLine(myChart, line){
//     //     const chartDataObject = myChart.config.data.datasets.forEach((dataset, index) => {
//     //         dataset.borderColor = getColor(index).fill
//     //         dataset.borderWidth = 3
//     //     })

//     //     myChart.config.data.datasets[line].borderWidth = 10;
//     //     myChart.config.data.datasets[line].borderColor = getColor(line).line;
//     //     myChart.update();
//     // }


    
// }