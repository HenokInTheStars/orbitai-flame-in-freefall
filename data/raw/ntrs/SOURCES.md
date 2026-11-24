# NTRS data tables (extracted from NASA Technical Reports Server PDFs)

These CSVs were transcribed from tables in public NASA reports (US Government works, public use
permitted). Values are copied as printed. Anything uncertain is flagged in the `notes` column — check
those against the PDF before relying on them. Cite the report in the README References section.

| File | Rows | What it's for in the dashboard | Source PDF |
|---|---|---|---|
| `bass_bass2_sibal_flammability_boundary.csv` | 31 | Real **flow (cm/s) vs O2 %** flammability map in microgravity: ignited / quenched / blow-off / no ignition. Fixes the BASS-II "fan setting" problem. | [NTRS 20150008962](https://ntrs.nasa.gov/api/citations/20150008962/downloads/20150008962.pdf) |
| `moc_spacecraft_materials_10psia.csv` | 26 | **"Earth-safe" side**: highest O2 % each material still self-extinguishes in NASA's Earth test, at 10.2 psia. Compare against the 34% exploration atmosphere. | [NTRS 20070018178](https://ntrs.nasa.gov/api/citations/20070018178/downloads/20070018178.pdf) |
| `pressure_flammability_thresholds.csv` | 7 | Pressure limits in ~100% O2 (EVA-suit-like) plus O2 limits at 10.2 psia for 7 materials. | [NTRS 20100015582](https://ntrs.nasa.gov/api/citations/20100015582/downloads/20100015582.pdf) |
| `moc_parametric_effects.csv` | 62 | How thickness, width, geometry, ignition and pass/fail rule change a material's Earth rating. Supports "the Earth test isn't one fixed number". | [NTRS 20110008636](https://ntrs.nasa.gov/api/citations/20110008636/downloads/20110008636.pdf) |
| `saffire_large_scale_tests.csv` | 12 | Saffire I–VI large burns, including **exploration-like atmospheres** (~54 kPa, ~31% O2) in Saffire VI — newer than the PSI tables. | [20210011521](https://ntrs.nasa.gov/api/citations/20210011521/downloads/ICES%202021-266%200503-2021%20final.pdf), [20240007488](https://ntrs.nasa.gov/api/citations/20240007488/downloads/Saffire%20ICES%202024%20Saffire%20presentation072124small.pdf), [20180005168](https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf) |
| `saffire_heat_release_products.csv` | 5 | Heat release, temperature rise, CO and CO2 produced by a real spacecraft-scale fire. | [NTRS 20240007488](https://ntrs.nasa.gov/api/citations/20240007488/downloads/Saffire%20ICES%202024%20Saffire%20presentation072124small.pdf) |
| `oxygen_soak_time_to_moc.csv` | 12 | **Post-EVA timer** feature: how long materials stay extra-flammable after 100% O2 exposure vs the 30-min rule of thumb. | [NTRS 20100019472](https://ntrs.nasa.gov/api/citations/20100019472/downloads/20100019472.pdf) |
| `partial_gravity_observations.csv` | 12 | **Known Unknowns** panel: the few partial-gravity numbers printed in text (6 measured values), 2 written findings, and the 4 planned FM2 test atmospheres. Each row has its PDF page. `kind` says whether a row is `measured`, `finding` or `planned`. | [NTRS 20250010653](https://ntrs.nasa.gov/citations/20250010653) (LUCI), [20260001966](https://ntrs.nasa.gov/citations/20260001966) (LPSC 2026 slides), [20040053567](https://ntrs.nasa.gov/citations/20040053567) (KC-135) |

## Values checked against the PDFs (2026-11-15)
- `bass_bass2...` GMT178-T17: **53 cm/s confirmed.** The PDF's text layer prints "6 → 53" and "No Blow-off" on this row, and the paper says flow could be set from 1 to 55 cm/s (p. 3). The flag was removed, so this row is now used.
- `pressure_flammability_thresholds.csv`: **all 7 rows confirmed** against the scanned Table 2 image, including Kydex 100 ULPI 1.8 / MTP 0.6. Column headers ULPI / MTP / ULOI / MOC are legible in the scan.
- Saffire-II `037 mm`: NTRS 20180005168 Table 1 lists these samples as **0.37 mm**, which confirms the missing decimal point.
- Link 2018 sample B15 (18.4% vs PSI-25's 18.0%): **not resolvable.** Table S1 prints B14 and B15 under one merged 18.4 cell, and in PSI-25 test P14 ran from 18.4% to 18.0% right before P15 started at 18.0%. It stays flagged and out of training.
- Saffire-III flow: **conflict confirmed, not resolvable.** NTRS 20180005168 Table 1 gives 25 cm/s for both samples; PSI-100 gives 30 cm/s. Both values are kept (`flow_cm_s` = 30 from PSI, `extra.flow_cm_s_ntrs` = 25, `extra.flow_conflict` = true). The UI should show both.
- Saffire-I/III thickness: PSI-98/PSI-100 give SIBAL as 0.37 / .33 **cm**, while NTRS 20180005168 gives 0.37 **mm** for every SIBAL sample. Probably a unit slip in the PSI tables. Both values are kept (`extra.thickness_mm_ntrs` = 0.37).

## Still to check
- `bass_bass2...` GMT45-T1/T2: the paper says their O2 readings may be inaccurate (kept flagged).
- `saffire_heat_release_products.csv` VI-2: column alignment in the slide was ambiguous.

## Key facts for the copilot and pitch (with source)
- BASS-II: low-speed quenching flow speeds were **1–5 cm/s**, higher at lower O2 (20150008962). In the appendix, flames ignited down to **16.9% O2**; 16.8% and 16.4% did not ignite.
- Earth test pressure effect: a material with an MOC of 30% O2 at 10.2 psia can fail the test at 25.9% O2 and 14.7 psia (20110008636 intro; see also 20090012334).
- Cast PMMA rated **14%** MOC vs **18%** for extruded PMMA in the same test (20110008636) — same plastic, different rating.
- Thinner silicone is more flammable: MOC fell from 22% (40 mil) to 17% (4 mil) (20110008636).
- Oxygen soak: the 30-minute rule was "not based on data"; closed-cell foams can trap enriched O2 for **hours** (Zotek F-30 ≈ 4.8 h in entrapment) (20100019472).
- Saffire VI two-sided PMMA raised cabin CO2 by 3.51 mmHg, above the 3 mmHg 1-hour crew limit cited in the same slide (20240007488).
- Water mist (STS-107, propane-air flames, 20 and 30 µm droplets, water mass fraction up to 0.40): suppression improved with more water and smaller droplets; lean flames were extinguished at the highest loadings. Flame-speed values appear only in figures ([NTRS 20040053582](https://ntrs.nasa.gov/api/citations/20040053582/downloads/20040053582.pdf)).
- ISS fine water mist extinguisher replaces CO2 because CO2 makes the cabin unsafe to breathe ([NTRS 20120018019](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20120018019.pdf)).

## Caution when comparing files
- `moc_*` and `pressure_*` are **Earth-gravity, still-air** tests. BASS/Saffire are **microgravity, forced flow**. That contrast is the point of the project, but label it on every chart.
- Saffire I–III used a 46 cm duct; IV–VI used 30 cm. Duct size changes flame spread, so don't merge them as one trend.
