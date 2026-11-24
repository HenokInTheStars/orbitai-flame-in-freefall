# Flame in Freefall — OrbitAI Lab

**NASA Space Apps Challenge 2026 · "Flame in Freefall"**

A dashboard that turns NASA Physical Sciences Informatics (PSI) microgravity combustion data into fire safety insights for spacecraft and lunar habitats.

**Our angle: Earth-safe isn't space-safe.** Spacecraft materials are screened with an Earth-gravity test, but in microgravity some materials behave differently, and future habitats may run at a lower pressure with more oxygen. The dashboard shows that gap using real test data. It also marks clearly where no data exists yet, such as partial gravity on the Moon or Mars.

- **Live demo:** TODO(team): add the Vercel URL after deploying
- **Demo video:** TODO(team): add the video link
- **Team:** TODO(team): names and roles (also on the About page)

## Run it

```bash
cd web
pnpm install
pnpm dev          # http://localhost:3000
```

The copilot needs a Google Gemini key: put `GEMINI_API_KEY=...` in `web/.env.local` (git-ignored, never committed) or, on Vercel, in Settings → Environment Variables. Everything else on the site works without it.

**Deploy (Vercel):** import this repo, set **Root Directory** to `web`, add `GEMINI_API_KEY`, deploy. Each push to `main` redeploys.

## Repository layout

```
data/raw/psi/      original PSI "Experimental table" CSVs by family, e.g. psi/SAFFIRE/PSI-99_SAFFIRE-II/ (never edited)
data/raw/ntrs/     tables transcribed from NASA Technical Reports Server PDFs (+ SOURCES.md)
data/raw/literature/  tables transcribed from peer-reviewed papers (+ SOURCES.md)
data/raw/reference/   Earth / Moon / Mars and cabin atmospheres
docs/papers/       source PDFs by topic (NTRS reports, papers, NASA-STD-6001B, PSI overviews)
docs/web_pages/    text extracted from public NASA pages (+ SCRAPED_SOURCES.md)
docs/metadata/     source register, investigation index, change log, category map
docs/challenge/    challenge requirements
docs/templates/    data collection forms and checklists
knowledge_base/    copilot document chunks (built by scripts/build_knowledge_base.py)
validation/        quality gate and copilot test questions
private/           NOT in git: copyrighted or licence-unchecked files kept for local reference
data/processed/    cleaned output the app loads (records.json / records.csv / investigations.json)
scripts/           clean_data.py — parse, normalise units, unify schema
                   build_training_sets.py, train_models.py — scikit-learn models
data/training/     model training tables (every row traceable to its source)
models/            exported model formulas (JSON), metrics.json, MODEL_CARD.md
scripts/export_web_data.py — writes the JSON the dashboard loads into web/public/data/
web/               Next.js + Tailwind dashboard; the copilot is a Next.js API route (web/app/api/copilot)
```

## Reproduce the data

Every number on the site is regenerated from the raw files by five scripts, run in this order:

```bash
pip install pandas scikit-learn pypdf
python scripts/clean_data.py            # raw CSVs -> data/processed/
python scripts/build_training_sets.py   # -> data/training/
python scripts/train_models.py          # -> models/ (formulas, metrics.json)
python scripts/export_web_data.py       # -> web/public/data/*.json
python scripts/build_knowledge_base.py  # -> knowledge_base/ and web/data/kb.json (copilot sources)
```

## Data cleaning

Each test becomes one record with this schema (fields may be null):

`investigation, psi_id, doi, test_id, material_or_fuel, geometry, thickness_mm, o2_percent, pressure_kpa, flow_cm_s, flow_direction, gravity, ignited, spread_rate_mm_s, burn_length_cm, extinction_note, outcome, notes, source_file, extra`

Rules:
- **No values are invented.** Blank or ambiguous source values become `null`. The reason goes in `notes`, and the raw text is kept in `extra`.
- Units and `~` are stripped from values, e.g. `"~ 21.5"` → 21.5, with a note that the value is approximate. Where the source gives an O2 range (`"22.1 to 22.0"`), the midpoint is stored and the note says so.
- Text outcomes (`Complete`, `Acceleratory`, `Insignificant`, `Extinction`, …) stay as text.
- `ignited` is `true` or `false` only when the table says so directly: a burn length above zero or `~ 0`, `Complete`, or a burn time is reported. Otherwise it is `null`.
- **Saffire-II** gives two records per sample, one microgravity (`gravity: "micro"`) and one Earth-gravity comparison (`gravity: "earth"`). The table does not state O2 or flow for the 1-g tests, so those fields are null in the 1-g records.

Known source issues and how we handled them:

| Issue | Handling |
|---|---|
| Saffire-II thickness `"037 mm"` | Read as 0.37 mm (likely missing decimal point); **flagged in notes**, not confirmed |
| Saffire-II header typo `Samle Thickness`; broken `µ` (`?-g`) | Columns matched by keyword |
| Saffire-II samples 2-6 and 2-9 have a blank material | Left null — not guessed |
| Saffire-II thickness `037 mm` | Read as 0.37 mm. Confirmed by NTRS 20180005168 Table 1, which lists these samples as 0.37 mm |
| Saffire-I/III give SIBAL thickness in **cm** (0.37 / .33 cm), but NTRS 20180005168 gives 0.37 **mm** for every SIBAL sample | Stored as the PSI table says (3.7 / 3.3 mm), with the NTRS value in `extra.thickness_mm_ntrs` and a note. Probably a unit slip in the PSI tables |
| BASS-II flow is a fan/air **display setting**, not cm/s | For the 27 SIBAL tests in the appendix of NTRS 20150008962, `flow_cm_s` (flow at the start of the test) and `outcome` come from the paper. A test is copied over only if its test #, GMT day and initial O2 all match PSI-25, and all 27 do. The other 102 BASS-II tests keep `flow_cm_s = null`. No conversion from display setting to cm/s is used |
| BASS-II T17 end flow 53 cm/s (could have been a typo for 5.3) | **Confirmed as 53.** The PDF prints "6 → 53", within the paper's 1–55 cm/s range, and the PSI-25 air display for T17 also reads "6 53" |
| Saffire-III flow: PSI-100 says 30 cm/s, NTRS 20180005168 / 20210011521 say 25 cm/s (both samples) | Both kept: `flow_cm_s` = 30, `extra.flow_cm_s_ntrs` = 25, `extra.flow_conflict` = true |
| BASS-II material is free text (`1/4" black rod`) | Material named only when the text says PMMA/SIBAL/Nomex/wax; raw text kept |
| FLEX test `C11M201` pressure = 0 mmHg | Implausible for a burning test → null, flagged |
| FLEX column `Burning rate; mm` | Kept raw in `extra`. The unit in the header looks wrong (burning-rate constants are usually mm²/s); still to be checked |

## Prediction models

There are three small scikit-learn models trained on measured test data: flame survival on Earth (PMMA rods), flame spread rate (PMMA rods, ISS and Earth) and FLEX droplet burning rate. They're tested only on held-out tests, compared with simple baselines, and checked against basic physics. The model card ([models/MODEL_CARD.md](models/MODEL_CARD.md)) gives the data, scores, limits and the variants we rejected. The dashboard computes predictions from the exported JSON formulas and labels each one as an estimate. The copilot is **not** fine-tuned; it uses retrieval only.

```bash
python scripts/clean_data.py
python scripts/build_training_sets.py
python scripts/train_models.py
python scripts/export_web_data.py   # writes web/public/data/*.json for the dashboard
```

## Use of AI

- **In the product:** the SI Copilot sends retrieved excerpts from our own sources to the Google Gemini API and asks it to answer only from them, with citations. It is prompt-engineered retrieval (RAG); nothing is fine-tuned. Model predictions on the site come from our own scikit-learn models, not from Gemini.
- **In building it:** TODO(team): list any AI assistants used to write code or text, as the Space Apps rules require.

## License

Code: MIT (see [LICENSE](LICENSE)). Data and documents keep their own terms: NASA PSI data is CC0 (cite each DOI), Link et al. 2018 is CC BY 4.0, NASA reports are listed with their sources below. See [docs/LICENSE_AND_ATTRIBUTION.md](docs/LICENSE_AND_ATTRIBUTION.md).

## References

### Data (NASA PSI, CC0 — cite each DOI)

| Investigation | PSI ID | DOI | Used for |
|---|---|---|---|
| Spacecraft Fire Experiment-II (Saffire-II) | PSI-99 | [10.60555/2chp-m469](https://doi.org/10.60555/2chp-m469) | Earth vs Space comparison |
| Burning and Suppression of Solids - II (BASS-II) | PSI-25 | [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) | Solid fuels, O2 range |
| Flame Extinguishment Experiment (FLEX) | PSI-69 | [10.60555/mbq8-0451](https://doi.org/10.60555/mbq8-0451) | Droplets, O2 vs pressure |
| Spacecraft Fire Safety Experiment-I (Saffire-I) | PSI-98 | [10.60555/0t15-1z43](https://doi.org/10.60555/0t15-1z43) | Large-scale flame spread |
| Spacecraft Fire Experiment-III (Saffire-III) | PSI-100 | [10.60555/040q-4h36](https://doi.org/10.60555/040q-4h36) | Large-scale flame spread |

Raw files are in `data/raw/` as downloaded. Not yet used: SAME (PSI-102, [10.60555/gd4k-8h62](https://doi.org/10.60555/gd4k-8h62)), SAME-R (PSI-101, [10.60555/2np7-jv14](https://doi.org/10.60555/2np7-jv14)), FLEX-2 (PSI-68, [10.60555/byp8-h018](https://doi.org/10.60555/byp8-h018)), BASS (PSI-26, [10.60555/58h4-dy80](https://doi.org/10.60555/58h4-dy80)), ACME E-FIELD (PSI-22, DOI TODO).

DOIs were looked up in the DataCite registry. PSI-98 was cross-checked against the citation file downloaded from PSI.

- NASA Physical Sciences Informatics: https://psi.nasa.gov/

### Reference tables (`data/raw/reference/`)

- `environments_comparison.csv`: gravity, pressure, O2 and O2 partial pressure for Earth, the Moon and Mars, plus spacecraft and habitat cabin atmospheres. Planet values come from the NASA NSSDC Planetary Fact Sheets ([Earth](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html), [Moon](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html), [Mars](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html), public domain). Cabin atmospheres come from NTRS 20150021491, pp. 4–6. O2 partial pressure is calculated as pressure × O2 fraction.

### Peer-reviewed literature (tables transcribed into `data/raw/literature/`)

- Link, S., Huang, X., Fernandez-Pello, C., Olson, S. & Ferkul, P. (2018). *The Effect of Gravity on Flame Spread over PMMA Cylinders.* Scientific Reports 8:120. https://doi.org/10.1038/s41598-017-18398-4 (CC BY 4.0). Supplementary Tables S1 (ISS, BASS-II) and S2 (Earth) contain 98 flame-spread-rate measurements against O2, flow and rod diameter, saved as `flame_spread_pmma_rods.csv`. Key result: in microgravity, flames spread at 17% O2, while on Earth there was no spread at 18% or below. See [data/raw/literature/SOURCES.md](data/raw/literature/SOURCES.md) for how the transcription was checked.

### NASA Technical Reports Server (tables transcribed by the team into `data/raw/ntrs/`)

US Government works. Values are copied as printed, and uncertain values are flagged in each file's `notes` column. See [data/raw/ntrs/SOURCES.md](data/raw/ntrs/SOURCES.md) for which file comes from which report.

| NTRS ID | Authors (as given) | Used in |
|---|---|---|
| [20150008962](https://ntrs.nasa.gov/api/citations/20150008962/downloads/20150008962.pdf) | Zhao, T'ien, Ferkul, Olson (2015) | BASS/BASS-II SIBAL flow vs O2 flammability boundary |
| [20070018178](https://ntrs.nasa.gov/api/citations/20070018178/downloads/20070018178.pdf) | Hirsch, Williams, Harper, Beeson, Pedley | MOC of spacecraft materials at 10.2 psia (Earth test) |
| [20100015582](https://ntrs.nasa.gov/api/citations/20100015582/downloads/20100015582.pdf) | Hirsch et al. | Pressure limits in ~100% O2; O2 limits at 10.2 psia |
| [20110008636](https://ntrs.nasa.gov/api/citations/20110008636/downloads/20110008636.pdf) | Hirsch, Juarez, Peyton, Harper, Olson | How test parameters change MOC ratings |
| [20210011521](https://ntrs.nasa.gov/api/citations/20210011521/downloads/ICES%202021-266%200503-2021%20final.pdf) | Urban et al. (2021), ICES-2021-266 | Saffire I–V large-scale tests |
| [20180005168](https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf) | Urban et al. (2017) | Saffire I/III flame size and spread |
| [20240007488](https://ntrs.nasa.gov/api/citations/20240007488/downloads/Saffire%20ICES%202024%20Saffire%20presentation072124small.pdf) | Saffire VI, ICES 2024 | Saffire VI exploration-like atmosphere; heat release, CO, CO2 |
| [20100019472](https://ntrs.nasa.gov/api/citations/20100019472/downloads/20100019472.pdf) | Harper, Smith, Juarez, Hirsch | Oxygen soak time after 100% O2 exposure |
| [20250010653](https://ntrs.nasa.gov/citations/20250010653) | Ferkul, Johnston, Kralik, Liao (2025), LUCI | Partial gravity: SIBAL and PMMA spread rates in spin-simulated Lunar g vs 1-g |
| [20260001966](https://ntrs.nasa.gov/citations/20260001966) | Ferkul, Kralik, Liao, Johnston (2026), LPSC slides | Partial gravity: Lunar-g SIBAL spread (centrifuge, aircraft), FM2 planned test atmospheres |
| [20040053567](https://ntrs.nasa.gov/citations/20040053567) | Sacksteder, Ferkul, Feier, Kumar, T'ien (2003) | Partial gravity: downward spread peaks near Martian gravity (written finding only) |
| [20040053582](https://ntrs.nasa.gov/api/citations/20040053582/downloads/20040053582.pdf) | (STS-107 water mist) | Earth Applications: water mist (text only) |
| [20120018019](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20120018019.pdf) | (ISS fine water mist extinguisher) | Earth Applications: why water mist replaces CO2 (text only) |

Comparison caution: the `moc_*` and `pressure_*` tables come from **Earth-gravity, still-air** tests, while BASS and Saffire are **microgravity, forced-flow** tests. Every chart must say which kind of data it shows. Saffire I–III used a 46 cm duct and IV–VI a 30 cm duct, so they should not be plotted as one trend.

### Software
- pandas (BSD-3-Clause), https://pandas.pydata.org/
- NumPy (BSD-3-Clause), https://numpy.org/
- scikit-learn 1.9 (BSD-3-Clause), https://scikit-learn.org/
- pypdf (BSD-3-Clause), https://pypdf.readthedocs.io/, used to extract PDF text and tables, and to build the copilot knowledge base (`scripts/build_knowledge_base.py`)
- Next.js 16 (MIT), https://nextjs.org/ and React 19 (MIT), https://react.dev/: the dashboard (`web/`)
- Tailwind CSS 4 (MIT), https://tailwindcss.com/: styling
- d3-geo (ISC), https://d3js.org/d3-geo, topojson-client (ISC) and world-atlas (ISC; map data from Natural Earth, public domain): the home-page globe
- lucide-react (ISC), https://lucide.dev/: icons
- clsx (MIT)
- Google Gemini API (REST `generateContent`, no SDK), https://ai.google.dev/: the SI Copilot API route, model `gemini-3.5-flash` with fallback `gemini-3.5-flash-lite`. Retrieval (BM25) + prompting over our own sources; not fine-tuned
- Fonts via Google Fonts (SIL Open Font License): Orbitron, Inter, JetBrains Mono
- UI layout inspired by the team's own design mock-up

### Background (to be cited in the UI where used)
- NASA-STD-6001B, *Flammability, Offgassing, and Compatibility Requirements and Test Procedures* (with Change 2), Test 1 Upward Flame Propagation (run in Earth gravity). https://standards.nasa.gov/sites/default/files/standards/NASA/B-w/CHANGE-2/2/NASA-STD-6001B-w-Change-2_Admin-Change.pdf
- UC Berkeley Engineering, "NASA-Funded Project Offers New Insights Into Fire Behavior in Space" (9 Dec 2024). Fernandez-Pello is quoted giving the O2 flammability limit as ~18% in normal gravity and ~15% in the spacecraft environment (MIST project, SoFIE series). https://engineering.berkeley.edu/news/2024/12/nasa-funded-project-offers-new-insights-into-fire-behavior-in-space/ — this is a news article; TODO: cite the peer-reviewed MIST paper once found.
- Thomsen Solis, M. (2018), *Flammability of Combustible Solids in Spacecraft Environments*, PhD thesis, UC Berkeley. https://escholarship.org/uc/item/01d5j8mc
- Exploration atmosphere (8.2 psia / 34% O2): NTRS [20150021491](https://ntrs.nasa.gov/citations/20150021491) (*Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere*) and [20200002311](https://ntrs.nasa.gov/citations/20200002311). It is a planned / working reference atmosphere, not an adopted standard.
- FM2, the first combustion experiment planned on the Moon: Ferkul et al., Lunar and Planetary Science Conference 2026, NTRS [20260000646](https://ntrs.nasa.gov/citations/20260000646). FM2 is **planned** and has not flown yet.
- List of PSI combustion investigations: https://www.nasa.gov/physical-sciences-informatics-psi/psi-investigations-by-research-area/
