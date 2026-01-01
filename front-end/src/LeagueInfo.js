import React from "react";
import "./LeagueInfo.css";
import bggLogo from './images/powered_by_K_01_SM.png';

//props: alignment, closePanel, showClose, showBack, headerText, hideFooter, shouldDisplay
const LeagueInfo = props => {
    
    return (
        <div className="league-info-container">
        
        <div className="league-info-header">
        Welcome to BGL!
        </div>
        <div className="league-info-description">
        This companion app is your one stop shop for everything Board Game League.  Let BGL Companion be your guide to schedules, standings, power rankings, and more as you navigate this season of Board Game League. 
        </div>
        
        <div className="league-info-section">
        <div className="league-info-prompt">What is BGL?</div>
        BGL stands for Board Game League.  It is an annual winter league, where individuals test their skills against a wide range of competitors in a number of challenging, but accessible board games.  BGL is exclusive to Northeast Ohio, sorry Kentucky.
        </div>
        
        <div className="league-info-section">
        <div className="league-info-prompt">What games are played?</div>
        BGL games generally meet the following criteria:
        <br/>
        <ul>
            <li className="league-info-list-item">4-player games</li>
            <li className="league-info-list-item">30 - 90 minute duration</li>
            <li className="league-info-list-item">1.5 - 2.5 difficulty rating on <a href="https://www.boardgamegeek.com" className="league-info-link">boardgamegeek.com</a></li>
        </ul>  
        All of these games are decided by the commissioner of the league either before the season or during.  There are some familiar games, but most are generally new to most players, so reading up on the rules or watching an instructional video can be helpful. Check out past seasons' schedules to get an idea for the types of games in BGL.
        </div>
        
        <div className="league-info-section">
        <div className="league-info-prompt">When are games played?</div>
        BGL games are played on a bi-weekly basis.  It is up to each group, as assigned in the schedule, to set their own play date within the allotted 2 weeks.  Scheduling generally takes place on the first day of the new board game's assigned week.  The commissioner can provide all players' phone numbers
        </div>
        
        <div className="league-info-section">
        <div className="league-info-prompt">Where are games played?</div>
        Similar to scheduling, the locations for Board Game League games are determined by the group playing each game.  This also generally takes place on the first day of the new board game's assigned week.
        </div>

        <div className="league-info-section">
        <div className="league-info-prompt">What if I don't know a game?</div>
        While all of the games in BGL can be challenging, they are all very accessible.  You can usually <u>watch a 5-15 minute</u> video explaining the rules or showing gameplay before your scheduled game.  Each game listed in the schedule has a link to <a href="https://www.boardgamegeek.com" className="league-info-link">boardgamegeek.com</a> which has ratings, difficulty levels, instructional videos, and other details about each game.
        </div>

        <div className="league-info-section">
        <div className="league-info-prompt">When does the season start?</div>
        Board games are perfect for when you're already cooped up inside.  As such, they are the perfect winter activity.  So every board game league season coincides with the new year and will typically start in January.  Refer to the schedule for more details.
        </div>
        
        <div className="league-info-section">
        <div className="league-info-prompt">What if I cannot make a game?</div>
        BGL allows for you to send a sub in your place for any game.  The only restriction is that subs cannot already be a BGL league member.  If you fail to find a sub, then you will receive a last place and 0 points for the week.
        <br/>
        <br/>
        If multiple players can't make a game within the allotted 2 weeks, the rules are the same. All missing players will receive a last place designation and 0 points
        </div>
        
        <div className="league-info-section">
        <div className="league-info-prompt">How do points work?</div>
        Board Game League awards points based on your finish in each game:
        <br/>
        <br/>
        <div>1st place = 3 points</div>
        <div>2nd place = 2 points</div>
        <div>3rd place = 1 points</div>
        <div>4th place = 0 points</div>
        <br/>
        <div>The top 8 players with the most points at the end of the 6-game regular season will qualify for the playoffs</div>
        </div>

        
        <div className="league-info-section">
        <div className="league-info-prompt">How do ties work?</div>
        <b>Board Game Ties: </b> BGL games cannot end in ties. If 2 or more players tie in a board game, they should first consult any tie breaker rules breaker rules dictated by the game itself.  If a tie still remains, or there aren't any tie breaker rules, the tied parties can agree on any challenge as a tie breaker (play one more turn, flip a coin, rock paper scissors, etc...).  If a challenge cannot be agreed upon, the commissioner must be consulted to break the tie.
        <br/>
        <br/>
        <b>BGL Standings Ties:</b> If two players are tied in the Standings at the end of a given season, the player with <u>more 1st place finishes</u> for the current season ranks higher. If they are tied in 1st place finishes, then 2nd place finishes are compared followed by 3rds. If a tie still remains after comparing placements, the tied parties can agree on any challenge to use as a tie breaker, similar to the tie rules for a single board game.  If a challenge cannot be agreed upon, the commissioner must be consulted to break the tie.
        </div>
        
        <div className="league-info-section">
        <div className="league-info-prompt">How do playoffs work?</div>
        Playoffs are comprised of 2 separate playoff games and a championship game.  The <u>top 8</u> players in the regular season standings qualify for playoffs.  The players fall into one of two groups based on their regular season points as described below:
        <br/>
        <br/>
        <b>Example Playoff Group 1</b>
        <ul>
            <li className="league-info-list-item">1st Place</li>
            <li className="league-info-list-item">4th Place</li>
            <li className="league-info-list-item">5th Place</li>
            <li className="league-info-list-item">8th Place</li>
        </ul>
        <b>Example Playoff Group 2</b>
        <ul>
            <li className="league-info-list-item">2nd Place</li>
            <li className="league-info-list-item">3rd Place</li>
            <li className="league-info-list-item">6th Place</li>
            <li className="league-info-list-item">7th Place</li>
        </ul>

        Players who finish with the <u>most</u> and <u>2nd most</u> points during the regular season get to choose the game for their respective playoff group. The <u>top two finishers</u> from each playoff game will move on to the championship round, where the game is decided by an agreement among all the players participating
        </div>
        
        <div className="league-info-section">
        <div className="league-info-prompt">How do I join?</div>
        Talk to the commissioner
        </div>
        
        <img src={bggLogo} className="board-game-geek-info"></img>
        </div>
    );
}

export default LeagueInfo;
