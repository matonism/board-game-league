@echo off
echo "Starting script..."
:: Run first command, then the second regardless of the first's success
node .\generateReports7.js & node .\weeklyEvents2.js
:: Run third command only if the fourth succeeds
if not exist "../front-end/build/analysis" mkdir "../front-end/build/analysis"
if not exist "../front-end/build/weeklyReport" mkdir "../front-end/build/weeklyReport"

robocopy "/addToBuild/analysis" "../front-end/build/analysis" /E /R:2 /W:5
robocopy "/addToBuild/weeklyReport" "../front-end/build/weeklyReport" /E /R:2 /W:5

echo "Script finished."
