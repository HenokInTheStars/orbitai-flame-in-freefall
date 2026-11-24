# Category map: where each topic's data lives

Flow: **Raw data → Experiments → Measurements → Results / Caution → Comparison → Prevention → Fire extinguisher → Materials**

Legend: ✅ have real data · 📄 have documents/text only · ⚠️ partial · ❌ gap

## 1. Raw data
| Topic | Status | Where |
|---|---|---|
| Experiment tables | ✅ | `data/raw/psi/<FAMILY>/PSI-xx_*/` (10 PSI experimental tables) |
| Report files | ✅ | `docs/papers/` (NTRS reports, papers, standard) |
| Presentations | 📄 | NTRS slide decks: Saffire-VI ICES 2024, LUCI 2025, Lunar/Martian gravity 2026, SAME detection 2007, centrifuge 2017 |
| Tables | ✅ | `data/raw/ntrs/`, `literature_extracted/`, `reference/` |
| Statistics | ⚠️ | Computed from our data (e.g. FLEX O2 vs burning rate r = 0.90). Link 2018 reports a regression |
| Graphs | 📄 | Figures exist only inside the PDFs. Our dashboard will redraw them from the tables |
| Detection | ✅ / 📄 | SAME and SAME-R tables (PSI-102, PSI-101); `docs/papers/DETECTION/` (ISS smoke detection 2007); SAME overview |

## 2. Experiments and measurements
| Topic | Status | Where |
|---|---|---|
| Ignition / flame spread / extinction | ✅ | `psi_unified/records.*` (425 tests), `flame_spread_pmma_rods.csv` (98), BASS boundary (31) |
| Measuring gas properties | ⚠️ | FLEX gas mixtures (O2/N2/CO2/He fractions, pressure); BASS-II O2/CO2/CO before and after; NASA Glenn thermodynamic coefficients (`GAS_PROPERTIES/`, a PDF library, not yet extracted) |
| Volumes | ⚠️ | Saffire heat release + CO/CO2 rise (`saffire_heat_release_products.csv`); duct sizes 46 vs 30 cm. Habitat volumes: ❌ |
| Pressure | ✅ | FLEX 70–309 kPa; Saffire-V/VI 54–73 kPa; pressure thresholds (7 materials); `environments_comparison.csv` |
| Structure / color / texture of flames | 📄 | Link 2018: flame turns yellow → blue and rounder at low flow in µg (p. 4, Fig. 4). ACME S-Flames and CLD (PSI-23, PSI-21) study flame structure; tables not collected. Images are in raw PSI folders (too large) |
| Mathematical equations | 📄 | Link 2018 (Damköhler number, thermal vs chemical regime), NASA Glenn coefficient equations (TP-2002-211556). To be compiled into an equations sheet with citations |

## 3. Results / caution / precautions
| Topic | Status | Where |
|---|---|---|
| Results | ✅ | Link 2018 (µg spreads at 16.8% O2, Earth stops at ~18%), Berkeley MIST (~15% vs ~18%), BASS-II boundary |
| Caution | ✅ | Exploration atmosphere: "material flammability is the most critical hurdle"; Saffire-VI CO2 above crew limit; oxygen soak (hours, not the 30-min rule) |
| Precautions | 📄 | NASA-STD-6001B (Test 1); `oxygen_soak_time_to_moc.csv`; Mir oxygen-generator fire lesson (in extinguisher reports) |

## 4. Comparison
| Topic | Status | Where |
|---|---|---|
| Earth vs other planets | ✅ | `reference/environments_comparison.csv`: Earth, Moon, Mars (NASA NSSDC) + ISS, shuttle, exploration atmosphere, Skylab, Apollo (NTRS 20150021491) |
| Microgravity vs Earth fire | ✅ | Saffire-II µg vs 1-g; Link 2018 Tables S1 vs S2; Earth MOC tables |
| Partial gravity (Moon 0.165 g, Mars 0.38 g) | 📄 | `docs/papers/PARTIAL_GRAVITY/` (6 reports: KC-135 partial-g flights, centrifuge, LUCI rocket, FM2). Tables not yet extracted, which is the next candidate |

## 5. Prevention → fire extinguishers
| Topic | Status | Where |
|---|---|---|
| Extinguishing agents (CO2, helium, water mist, foam) | 📄 | `FIRE_EXTINGUISHERS/` (suppression testing 2004, CO2 vs helium 2004, Orion vs Li-ion battery 2018), `WATER_MIST/` (4 reports) |
| Inert-gas suppression data | ✅ | FLEX: CO2 and helium dilution vs extinction (274 tests) |

## 6. Materials
| Topic | Status | Where |
|---|---|---|
| Spacecraft materials' Earth-test ratings | ✅ | `moc_spacecraft_materials_10psia.csv` (26), `moc_parametric_effects.csv` (62), `pressure_flammability_thresholds.csv` (7) |
| Materials tested in microgravity | ✅ | PMMA, SIBAL, Nomex, silicone, cotton (Saffire, BASS, Link 2018) |
| NASA materials database (MAPTIS) | ❌ | Needs a free MAPTIS account (https://maptis.nasa.gov). Not scraped because it's behind a login |
| "Materials used on other planets" | ❌ | No habitat bill-of-materials found publicly. Use the spacecraft materials above |

## Not collected, on purpose
- **SAE smoke papers** (SAE 2009-01-2468, 2008-01-2089): paywalled. Cite them, but the PDFs weren't downloaded.
- **cfp.berkeley.edu**: robots.txt disallows automated access.
- **MAPTIS**: login required.
