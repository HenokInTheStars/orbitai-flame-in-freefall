# Model card: OrbitAI Lab flammability models

**What these are:** three small statistical models (scikit-learn 1.9), trained on measured NASA and peer-reviewed test data. They are **not** AI language models, and the copilot is not fine-tuned. Every prediction in the dashboard is labelled **"model estimate, not a measurement"**.

**Reproduce:** `python scripts/clean_data.py && python scripts/build_training_sets.py && python scripts/train_models.py`. The full metrics are in `models/metrics.json`.

## How testing works
Each model is scored only on tests it **never saw during training**. With grouped cross-validation, all rows from one physical test (or one rod size) stay together on the same side of the split. Every model is compared with a baseline that always guesses the most common answer or the average.

## Model 1: Does the flame survive? Earth gravity, PMMA rods (logistic regression)
- **Data:** Link et al. 2018, Table S2: 46 conditions, 4 rod diameters, 9 of them with no flame spread.
- **Inputs:** O2 %, 1/rod diameter. **Output:** probability that the flame keeps spreading.
- **Testing:** leave-one-rod-diameter-out. The model predicts a rod size it was never trained on.
- **Results:** balanced accuracy **0.89**, AUC **0.95**, accuracy 0.83. For comparison, "always burns" scores 0.80 accuracy and O2 alone gives AUC 0.90.
- **Per test round** (`per_round` in `metrics.json`). Every flame-out was caught in every round. All 8 mistakes were false alarms, where the model said the flame might go out but it kept burning. Only 4 rod sizes exist in the published Earth table, so 4 rounds is the most an honest test allows.

| Rod size held out | Rows | Accuracy | Flame-outs caught | False alarms |
|---|---|---|---|---|
| 0.32 cm | 13 | 0.92 | 2 / 2 | 1 |
| 0.64 cm | 13 | 0.69 | 3 / 3 | 4 |
| 0.95 cm | 10 | 0.90 | 2 / 2 | 1 |
| 1.27 cm | 10 | 0.80 | 2 / 2 | 2 |
- **Earth model vs ISS measurements:**

| Rod diameter | Earth model: 50% survival at | ISS measured: still spreading at |
|---|---|---|
| 0.64 cm | 18.5% O2 | **16.8% O2** |
| 0.95 cm | 18.7% O2 | **17.5% O2** |
| 1.27 cm | 18.75% O2 | **17.6% O2** |

- **Microgravity:** there is **no model**. All 51 ISS rows show flame spread (down to 16.8% O2). The paper doesn't tabulate the conditions where the flame went out, so there's nothing to learn a boundary from. The dashboard states the measured fact instead.
- **Tried and rejected** (scores in `metrics.json`):
  - *One model for all conditions.* It looked good overall (balanced accuracy 0.87), but only because the all-"burned" microgravity rows were trivially right. Inside the conditions that contain flame-outs, accuracy was about 0.6.
  - *SIBAL fabric in microgravity.* Only 10 flame-out points, and the best variant (O2 × flow) didn't beat guessing "burns" on accuracy (0.64 vs 0.70, 33 rows after test GMT178-T17 was confirmed and un-flagged). The dashboard shows the measured flow vs O2 map instead.

## Model 2: Flame spread rate over PMMA rods (ridge regression, mm/s)
- **Data:** Link et al. 2018, Tables S1 + S2: 88 rows, 22 groups (ISS samples, plus Earth data grouped by rod size).
- **Inputs:** O2 %, log flow, 1/diameter, microgravity flag, microgravity × O2.
- **Results:** mean error **0.018 mm/s**, R² **0.53**. The "always average" baseline gives 0.028 mm/s and R² −0.11. Measured rates range from 0.013 to 0.236 mm/s.
- **Agrees with the paper:** the model's microgravity and Earth lines cross at about **19.4% O2**, below which microgravity spread is faster. Link et al. report the same crossover at about 19% (p. 6).

## Model 3: FLEX droplet burning rate (ridge regression)
- **Data:** NASA PSI-69 FLEX: 256 ISS droplet tests (methanol and heptane).
- **Inputs:** O2 %, pressure (kPa), CO2 fraction, helium fraction, fuel, **initial droplet diameter (mm)**.
- **Results:** mean error **0.048**, R² **0.71**. The baseline gives 0.107 and R² 0.00. Without droplet diameter the model scored 0.055 and R² 0.61 (`without_droplet_diameter` in `metrics.json`).
- **Why droplet diameter:** the PSI FLEX overview (p. 2) says initial droplet size causes transient, non-quasi-steady burning, and FLEX varied it on purpose. In the data, larger droplets show a *lower* reported burning rate (−0.064 per mm). This is a measured association; we have not yet found the paper that explains the mechanism, so the UI should not state a cause.
- **⚠️ Unit:** as reported in PSI-69 ("Burning rate; mm"). It's probably mm²/s but not yet verified, so the UI shows "burning rate (as reported)".
- **Associations** (not cause and effect): more O2 means faster burning, CO2 dilution slows it, and helium dilution speeds it up relative to nitrogen.

## Data rules
- Only measured outcomes are used. Nothing is guessed or filled in.
- Each physical test comes from one source only, so nothing is counted twice.
- Flagged rows are left out by default; retraining with them included changes the results by less than 0.03 (`metrics.json`). Flagged rows include: O2 readings the paper calls possibly inaccurate, the 53 cm/s value marked "verify", re-used samples, B15's conflicting O2, the 0 mmHg pressure and approximate burn times.
- **Physics checks, all passed:** more O2 → more likely to burn and faster spread (both gravities); thinner rod → faster spread; more O2 → faster droplet burning.

## Limits (also shown in the UI)
- Predictions are only shown **inside the tested ranges** saved in each model JSON. Outside them the dashboard says "no test data".
- **No Moon or Mars predictions.** Partial gravity isn't in the training data.
- These are small datasets (46–256 rows). The models describe trends in NASA tests and are not material certification.

## Sources
Link, Huang, Fernandez-Pello, Olson & Ferkul (2018), *Scientific Reports* 8:120, doi:10.1038/s41598-017-18398-4 (CC BY 4.0) · NTRS 20150008962 (Zhao, T'ien, Ferkul, Olson 2015) · NASA PSI-69 FLEX, doi:10.60555/mbq8-0451 (CC0).
