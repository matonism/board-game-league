const RegularSeasonPerformanceColumns = [
    {label: 'Player', sortField: 'name', columnClass: 'first-column'},
    {label: 'Average Placement', sortField: 'roundedAveragePosition', columnClass: 'second-column'},
    {label: 'Firsts', sortField: 'placements.first', columnClass: ''},
    {label: 'Seconds', sortField: 'placements.second', columnClass: ''},
    {label: 'Thirds', sortField: 'placements.third', columnClass: ''},
    {label: 'Fourths', sortField: 'placements.fourth', columnClass: ''},
    {label: 'Total Games', sortField: 'gamesPlayed', columnClass: 'third-column'},
];

export default RegularSeasonPerformanceColumns;