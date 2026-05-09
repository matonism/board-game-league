## Board Game League ML tools

### Repeatable run (Windows / PowerShell)

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\machineLearning\run.ps1
```

This will:

- rebuild `tools/machineLearning/bgl_ml_features.json`
- print **probabilistic** predictions for any future rows (blank placements) in `Schedules.txt`
- print a **mechanics-transfer** ranking for the 2026 `Wyrmspan` championship (game-to-game generalization)
- print an **explanation** of one pod’s prediction (top helping/hurting factors + global weights)
- print a **game fit** report (mechanics + similar games + fit-by-similar-games)
- generate an **HTML report** for one pod under `tools/machineLearning/reports/`

### Run individual steps

From the repo root:

#### Build the dataset

```powershell
node .\tools\machineLearning\generateDataset.js
```

#### Predict upcoming games with probabilities

```powershell
python .\tools\machineLearning\predictUpcoming.py
```

Optional filters (same defaults as before when omitted):

```powershell
python .\tools\machineLearning\predictUpcoming.py --mode preseason --year 2026 --week Championship --game Wyrmspan --pod 2026__Championship__Wyrmspan__pod1 --sims 50000 --temperature 0.50 --seed 42 --n-estimators 400
```

#### Walk-forward calibration (RF path)

Uses expanding history only through prior weeks, then scores MAE on placement, Brier on win, and log loss on the predicted winner.

```powershell
python .\tools\machineLearning\calibratePredictions.py --max-pods 100 --sims 5000 --n-estimators 150
```

Append each run to a CSV so you can compare over time (same flags matter when comparing rows):

```powershell
python .\tools\machineLearning\calibratePredictions.py --log .\tools\machineLearning\calibration_runs.csv
```

Compare runs while omitting a column (RF still trains on the rest), tagged for CSV:

```powershell
python .\tools\machineLearning\calibratePredictions.py --max-pods 100 --drop-features FamiliarGame --run-label baseline_no_FG --log .\tools\machineLearning\calibration_ablation.csv
python .\tools\machineLearning\calibratePredictions.py --max-pods 100 --run-label with_FG --log .\tools\machineLearning\calibration_ablation.csv
```

#### Pairwise win model (separate from RF)

Trains a logistic model on within-pod pairwise outcomes (feature differences), then runs the same Plackett-Luce Monte Carlo. Does not change `predictUpcoming.py`.

```powershell
python .\tools\machineLearning\predictPodProbabilities.py --year 2026 --week Championship --game Wyrmspan
```

#### Explain one pod (one week at a time)

```powershell
python .\tools\machineLearning\explainPodPrediction.py --year 2026 --week Championship --game Wyrmspan
```

If you need to target a specific pod:

```powershell
python .\tools\machineLearning\explainPodPrediction.py --year 2026 --week Championship --game Wyrmspan --pod 2026__Championship__Wyrmspan__pod1
```

#### Mechanics transfer (game-to-game generalization)

```powershell
python .\tools\machineLearning\mechanicsTransfer.py
```

#### Game fit report (mechanics + similar games + player fit)

```powershell
python .\tools\machineLearning\gameFitReport.py --game Wyrmspan --year 2026 --week Championship
```

#### Generate the HTML report (one pod at a time)

```powershell
python .\tools\machineLearning\generateHtmlReport.py --year 2026 --week Championship --game Wyrmspan
```

Optional:

```powershell
python .\tools\machineLearning\generateHtmlReport.py --year 2026 --week Championship --game Wyrmspan --pod 2026__Championship__Wyrmspan__pod1 --sims 50000 --temperature 0.50
```

### Notes

- Source schedules live in `tools/output/Schedules.txt`
- Game mechanics + weight live in `tools/output/GameSummaries.txt`
- Dataset generator is `tools/machineLearning/generateMLData.js` (entrypoint: `tools/machineLearning/generateDataset.js`)

