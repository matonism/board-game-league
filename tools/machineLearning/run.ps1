$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== BGL ML Pipeline ==="
Write-Host ""

Write-Host "1) Building dataset (node tools/machineLearning/generateDataset.js)"
node "$PSScriptRoot\generateDataset.js"

Write-Host ""
Write-Host "2) Predictions with probabilities (RandomForest)"
python "$PSScriptRoot\predictUpcoming.py"

Write-Host ""
Write-Host "3) Mechanics transfer (game-to-game generalization)"
python "$PSScriptRoot\mechanicsTransfer.py"

Write-Host ""
Write-Host "3b) Explain pod prediction (factors + weights)"
python "$PSScriptRoot\explainPodPrediction.py" --year 2026 --week Championship --game Wyrmspan

Write-Host ""
Write-Host "4) Game fit report (mechanics + similar games)"
python "$PSScriptRoot\gameFitReport.py" --game Wyrmspan --year 2026 --week Championship

Write-Host ""
Write-Host "5) HTML report"
python "$PSScriptRoot\generateHtmlReport.py" --year 2026 --week Championship --game Wyrmspan

