import colorList from "./colorList";
import { getColor, highlightLine } from "./highlightChartSettings";





export function getPowerRankingChartData(powerRankings){

    if(powerRankings.length <= 1){
        return null;
    }

    let xAxisLabels = [];
    let rankingData = {};
    powerRankings.forEach((week, index) => {
        xAxisLabels.push(week.label);
        
        week.rankings.forEach((person, ranking) => {
            const readableRanking = ranking+1;
            const key = person.trim();
            if(Object.keys(rankingData).includes(key)){
                rankingData[key].push(readableRanking);
            }else{
                rankingData[key] = [readableRanking];
            }
        })
    })
    let defaultHighlight = parseInt(Math.random() * (Object.keys(rankingData).length - 1))
    const datasets = Object.keys(rankingData).map((name, index) => {
        const color = getColor(index);
        return {
            label: name,
            data: rankingData[name],
            // borderWidth: 1,
            backgroundColor: color.fill,
            borderColor: index == defaultHighlight ? color.line : color.fill,
            color: color.line,
            // fill: "start",
            borderWidth: index == defaultHighlight ? 10 : 2,
            onClick: function(event, legendItem) {
              highlightLine(event, this.chart, legendItem.datasetIndex)
            }

        }
    });

    return {xAxisLabels, datasets};
    // return formatChartJSObject(xAxisLabels, datasets)
}







export function getStandingsChartData(standings){
    let xAxisLabels;
    let rankingData = {};
    standings.regularSeason.forEach((player, index) => {
        if(!xAxisLabels){
            xAxisLabels = player.weeklyScores.map((score, index) => {
                return 'Week ' + (index + 1);
            })
            xAxisLabels.unshift('');
        }
        
        let runningTotal = 0;
        player.weeklyScores.forEach((score) => {

            const key = player.player.trim();
            if(Object.keys(rankingData).includes(key)){
                rankingData[key].push(runningTotal += score);
            }else{
                rankingData[key] = [0, runningTotal += score];
            }
        })


    })
    let defaultHighlight = parseInt(Math.random() * (Object.keys(rankingData).length - 1))
    const datasets = Object.keys(rankingData).map((name, index) => {
        const color = getColor(index);
        return {
            label: name,
            data: rankingData[name],
            // borderWidth: 1,
            backgroundColor: color.fill,
            borderColor: index == defaultHighlight ? color.line : color.fill,
            color: color.line,
            // fill: "start",
            borderWidth: index == defaultHighlight ? 10 : 2,
            onClick: function(event, legendItem) {
              highlightLine(event, this.chart, legendItem.datasetIndex)
            }

        }
    });

    return {datasets, xAxisLabels}
}
