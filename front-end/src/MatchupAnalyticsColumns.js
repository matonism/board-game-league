const MatchupAnalyticsColumns = [
    {label: 'Player', sortField: 'name', columnClass: 'first-column'},
    {label: 'Points Per Game', sortField: 'averageScore', columnClass: ''},
    {label: 'Total Points', sortField: 'points', columnClass: ''},
    {label: 'Unique Opponents', sortField: 'uniqueOpponentsTotal', columnClass: ''},
    {label: 'Opponent Strength', sortField: 'averageOpponentStrength', columnClass: 'third-column'},
];

export default MatchupAnalyticsColumns;