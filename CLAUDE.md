Flame in Freefall — Project Context (OrbitAI Lab)

You are helping team OrbitAI Lab build a project for the NASA Space Apps Challenge 2026, challenge "Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data." Read this whole file before writing code. When in doubt, choose the simpler option that ships.

Hard constraints
Event: November 14–15, 2026. Submission likely closes Nov 15, 23:59 local time (verify in the official 2026 Project Submission Guide). Every decision should favor a working, deployed demo.
Deliverables: (1) deployed web dashboard, (2) public GitHub repo with clean structure, data ingest scripts and a clear README, (3) a 30–120 s demo video (English or English subtitles).
Originality and references: all external code, text, images and data must be listed in the README "References" section (the submission form requires it). No copyrighted media without permission.
What NASA wants (from the official challenge video)

The dashboard must:

Identify the PSI combustion investigations most relevant to fire safety in crewed habitats.
Extract data that supports predictive modeling of flammability and fire scenarios.
Highlight research that informs next-generation fire safety controls and equipment. Optional add-on: Earth applications (fine water mist suppression, smoke detection, firefighter gear).

Judging criteria (equal weight): Impact, Creativity, Validity, Relevance, Presentation. Validity matters: the science must be checkable. Never invent data or present guesses as results.

Our angle (what makes us different)

"Earth-safe isn't space-safe." NASA rates spacecraft materials with an Earth-gravity test (NASA-STD-6001 Test 1), but microgravity research shows materials can burn at lower oxygen levels in space (~15% vs ~18% in normal gravity, per 2024 NASA-funded Berkeley work). Future lunar habitats will likely run at 8.2 psi / 34% O2 (NASA "exploration atmosphere"), which raises fire risk. Our dashboard makes this gap visible and honest, including where data does not exist yet (partial gravity — Moon/Mars — is largely untested; NASA's FM2 will be the first test on the Moon).

Data (NASA Physical Sciences Informatics, psi.nasa.gov)

We use each investigation's small Experimental table CSV, not the raw data (raw folders are 100s of GB of video). All PSI data is CC0, but we must cite each investigation's DOI.

Tier 1 (core dataset), files in data/raw/:

Saffire-II — PSI-99 (PSI-99_Experimental table_SAFFIRE-2.csv), 16 samples. Columns: Sample Number, Material, Samle Thickness [sic], Sample Length, Sample Width (cm), Air Flow (cm/s), Percent O2 (Note 1), Ignition Power (W), Ignition Time (s), Burn Time (s), Flow Direction, µ-g Burn Length, µ-g Spread Length, 1-g Burn Length, 1-g Spread Rate, Camera 1, Camera 2. Only table with microgravity vs Earth-gravity results side by side → powers "Earth vs Space".
BASS-II — PSI-25, 130 tests. Columns include PI, Test #, Date, Sample #, Fuel Sample Material, Flow restrictor, Fan display, Air display, Radiometer gain, Calibrated initial/final O2 % by vol, Initial/Final CO2 %, Initial/Final CO (ppm).
FLEX — PSI-69, 275 droplet tests. Columns include Fuel, Ambient pressure (mmHg), O2/N2/CO2/He initial mole fractions, Droplet initial diameter (mm), Visible flame extinction diameter (mm), Burning rate, Burn time (s), Test end.

Tier 2 (supporting, optional): Saffire-I PSI-98 (5 rows, has Air Flow cm/s and % O2), Saffire-III PSI-100 (3 large-scale rows), SAME PSI-102 and SAME-R PSI-101 (smoke: material, air flow, weight loss rate, aging), FLEX-2 PSI-68, ACME E-FIELD PSI-22 (electric field as a partial-gravity proxy; use for visuals/papers, its table is just test-day logs).

Copilot knowledge base: the publications listed on each investigation page (DOIs/abstracts).

Known cleaning issues
Units and symbols inside values: "~ 21.5", "20 cm/s", "0.27 mm", "80 W" → strip to numbers.
Typos: "037 mm" almost certainly means 0.37 mm (flag it in a notes column, don't silently fix).
Header typo "Samle Thickness".
BASS-II flow is fan/air display settings, not cm/s. Find the conversion in its Science Documents; until then keep the raw setting and label it as such. Do not fabricate cm/s values.
"n/a", "none", "Insignificant", "Complete", "Acceleratory" are text outcomes — keep them as categorical fields, don't coerce to numbers.

Architecture (default stack unless the team says otherwise)
data/
  raw/              original CSVs, never edited
  processed/        cleaned JSON/CSV the app loads
scripts/
  clean_data.py     pandas: parse, normalize units, unify schema, write processed/
web/                Next.js + Tailwind (no component library), charts as plain SVG (deployed on Vercel) — team decision 2026-11-15, replaces Vite + Plotly
  public/data/      JSON written by scripts/export_web_data.py (never hand-edited)
  components/       HabitatLab (presets, sliders, stress test, model predictions), FlameVisual, FlamePlayground, Scatter, OxygenSoak, StoryMode, Globe, HomeHero, Copilot (right-side dock on every page), Nav, ui
  app/              pages: / (Home), /scientists, /explorers, /investigation, /about
  app/api/copilot/  Next.js API route for the copilot (Google Gemini REST API, gemini-3.5-flash; key in GEMINI_API_KEY, never committed) — team decision 2026-11-15
README.md

Unified record schema (one row per test), fields may be null: investigation, psi_id, doi, test_id, material_or_fuel, geometry, thickness_mm, o2_percent, pressure_kpa, flow_cm_s, flow_direction, gravity ("micro"|"earth"), ignited, spread_rate_mm_s, burn_length_cm, extinction_note, outcome, notes, source_file

Features (build in this order; stop adding when time runs out)
Habitat presets + sliders (O2 %, pressure psi, airflow cm/s): ISS 21% / 14.7 psi; Exploration atmosphere 34% / 8.2 psi; Alternative 26.5% / 10.2 psi; EVA suit 100% / 4.3 psi. Sliders filter/highlight matching tests.
Flame visual: animated Earth teardrop (yellow, buoyant) vs microgravity sphere (blue). Driven by the sliders. Cheap and the strongest video moment.
Parametric plot: airflow vs O2 (and pressure vs O2 for FLEX), colored by material/fuel, real data points only, tooltip shows source investigation + DOI.
Earth vs Space comparison (Saffire-II): µg vs 1-g burn length / spread rate per material. Be honest when microgravity is less severe (e.g. some silicone samples) — show both directions.
Risk ranking table: transparent score from available fields; show the formula on screen.
SI Copilot: retrieval over our processed data + paper abstracts, answers with citations. Prompt-engineered RAG only — do NOT claim fine-tuning. If data doesn't cover a question, say so.
Known Unknowns panel: shade Moon/Mars gravity as untested; uncertainty, not fake predictions.
Earth Applications hub: 3 static cards (water mist, enclosed-space fires, smoke detection).

Rules for you (Claude)
Never invent data values, papers, DOIs or results. If something is missing, leave a TODO and tell us.
Label any estimate or interpolation as an estimate in the UI.
Keep code simple and readable; the team must be able to explain it to judges.
Prefer small working increments: get one chart working end-to-end before adding the next.
Every new data source or library goes into README References in the same change.
Ask before adding heavy dependencies or changing the stack.
Git: when committing or pushing to GitHub, do not mention Claude or any AI tool in commit messages, PR titles or descriptions. Do not add "Co-Authored-By" trailers or "Generated with" lines. Write plain, descriptive commit messages (e.g. "Add Saffire-II cleaning script").
