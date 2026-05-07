## To Generate Historical Data JSON
- cd .\tools\
- node .\historicalDataRetreiver.js

Then locate the historicalData.json file in the tools/output folder

## To Upload files to Drive
- cd .\tools\
- node .\uploadBGLFilesOAuth.js

Note, I did use a service account fo reading from files so that my account isn't publicly accessible by users of BGLCompanion.com.  But when I tried using the service account for uploading documents, it didn't work.  I got the following error:

Upload Error: The user's Drive storage quota has been exceeded.

So I had to use OAuth.  And I believe this is fine as long as I don't expose my tools publicly



To do a full upload of all the Weekly Events and Leaderboard:
run: .\updateLeagueAfterGame.bat -d 

To do a full upload of all the Weekly Events and Leaderboard AFTER UPDATING THE REACT APP ITSELF:
run: .\updateLeagueAfterGame.bat -d -b


To get Board Game Summaries, you must run the following command after updating the getBoardGameGeekInfo.js to pull data for the game you want:
node getBoardGameGeekInfo.js

Then copy the json response into GameSummaries.txt