@echo off
echo "Starting script..."

:: If we want to update the public facing Leaderboards and Weekly Events as well as the Google Drive sources (still need to manually update source on NotebookLM)
set "DEPLOY_ON=false"

:: IF Changes were made to the actual react app, this will be true
set "SHOULD_REBUILD_REACT=false"

:: 1. Loop through all arguments (%*) to find "-d"
for %%A in (%*) do (
    if /I "%%A"=="-d" set "DEPLOY_ON=true"
)
:: 1. Loop through all arguments (%*) to find "-d"
for %%A in (%*) do (
    if /I "%%A"=="-b" set "SHOULD_REBUILD_REACT=true"
)

if "%SHOULD_REBUILD_REACT%"=="true" (
    echo "-b" flag detected. Rebuilding React App...
    cd ../front-end
    npm run build
    cd ../tools
) else (
    echo No "-b" flag provided. Skipping Rebuilding React App...
)

echo Re-pulling historical data...
:: Retrieve historical data, schedules, standings, strength of schedules, etc..
node .\historicalDataRetreiver.js

echo Generating Report and Weekly Events...
:: Generate Reports and Weekly Events html pages and json files
node .\generateReports7.js & node .\weeklyEvents2.js

echo Copying reports to build folder...
:: Copy the generated reports to the front-end build folder
if not exist "../front-end/build/analysis" mkdir "../front-end/build/analysis"
if not exist "../front-end/build/weeklyReport" mkdir "../front-end/build/weeklyReport"

robocopy "./addToBuild/analysis" "../front-end/build/analysis" /E /R:2 /W:5
robocopy "./addToBuild/weeklyReport" "../front-end/build/weeklyReport" /E /R:2 /W:5

:: Deploy the app 
if "%DEPLOY_ON%"=="true" (
    echo "-d" flag detected. Uploading React App and Busting Cloudfront cache...
    :: Upload the react app so the reports and weekly events are updated
    cd ../front-end
    aws s3 sync ./build s3://board-game-league --acl public-read && aws cloudfront create-invalidation --distribution-id E31VRL2B3BY883 --paths "/*"
    cd ../tools
) else (
    echo No "-d" flag provided. Skipping upload react app to S3
)

echo "Script finished."
