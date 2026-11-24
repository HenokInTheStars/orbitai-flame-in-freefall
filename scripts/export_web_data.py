"""Export the small JSON files the dashboard loads.

Run after the other three scripts:   python scripts/export_web_data.py
Writes web/public/data/*.json. Nothing is computed here except unit conversions and
reshaping: every value comes from data/processed/ or data/raw/ (see README References).
The dashboard does the habitat stress test itself so the formula is visible in the UI code.
"""

import json
import shutil
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
RAW = ROOT / "data" / "raw"
OUT = ROOT / "web" / "public" / "data"
PSI_TO_KPA = 6.894757


def clean(v):
    """NaN -> None so the JSON has null, not NaN."""
    if isinstance(v, float) and pd.isna(v):
        return None
    return v


def rows(df):
    return [{k: clean(v) for k, v in r.items()} for r in df.to_dict(orient="records")]


def write(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=1, ensure_ascii=False), encoding="utf-8")
    n = len(obj) if isinstance(obj, list) else len(obj.get("rows", obj))
    print(f"  {name:28} {n} items")


def habitats():
    env = pd.read_csv(RAW / "reference" / "environments_comparison.csv")
    pick = {  # dashboard preset id -> row in environments_comparison.csv
        "iss": "ISS / Space Shuttle cabin",
        "alternative": "Shuttle staged-decompression atmosphere",
        "exploration": "Exploration atmosphere (planned)",
        "eva": "EVA suit (lowest anticipated pressure)",
    }
    out = []
    for pid, name in pick.items():
        r = env[env["environment"] == name].iloc[0]
        out.append({"id": pid, "name": name, "pressure_kpa": clean(r["pressure_kpa"]),
                    "pressure_psia": round(r["pressure_kpa"] / PSI_TO_KPA, 1),
                    "o2_percent": clean(r["o2_percent"]),
                    "source": f"{r['source']}, {r['source_location']}", "notes": clean(r["notes"])})
    places = rows(env[env["type"] == "planet"][["environment", "gravity_g", "pressure_kpa", "o2_percent",
                                                 "source", "source_location", "notes"]])
    return {"presets": out, "places": places}


def materials():
    df = pd.read_csv(RAW / "ntrs" / "moc_spacecraft_materials_10psia.csv")
    keep = ["material", "composition", "category", "moc_qualifier", "moc_percent_o2", "pressure_psia",
            "test_condition", "observations_at_moc", "notes", "source"]
    return {
        "rows": rows(df[keep]),
        # MOC = highest O2 % at which the material still self-extinguishes in the Earth test (NASA-STD-6001 Test 1).
        "pressure_effect": {
            "equation": "MOC = m * Pt + b",
            "slope_min_pct_per_psia": -0.251, "slope_max_pct_per_psia": -0.975, "slope_avg_pct_per_psia": -0.607,
            "valid_for_moc_range_pct": [25, 35],
            "source": "NTRS 20110008636 (Hirsch, Juarez, Peyton, Harper, Olson), Eq. 1 and text, citing earlier "
                      "pressure-effects work",
            "use": "Only to show an ESTIMATE range when the habitat pressure differs from the 10.2 psia test pressure",
        },
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("web data ->", OUT)

    write("habitats.json", habitats())
    write("materials_moc.json", materials())
    write("oxygen_soak.json", rows(pd.read_csv(RAW / "ntrs" / "oxygen_soak_time_to_moc.csv")))
    write("partial_gravity.json", rows(pd.read_csv(RAW / "ntrs" / "partial_gravity_observations.csv")))
    write("bass_boundary.json", rows(pd.read_csv(PROC / "ntrs" / "bass_bass2_sibal_flammability_boundary.csv")))
    write("pmma_rods.json", rows(pd.read_csv(PROC / "flame_spread_pmma_rods.csv")))
    write("saffire_large.json", rows(pd.read_csv(PROC / "ntrs" / "saffire_large_scale_tests.csv")))
    write("pressure_thresholds.json", rows(pd.read_csv(PROC / "ntrs" / "pressure_flammability_thresholds.csv")))

    records = json.loads((PROC / "records.json").read_text(encoding="utf-8"))
    write("records.json", records)
    write("saffire2.json", [r for r in records if r["psi_id"] == "PSI-99"])
    shutil.copy2(PROC / "investigations.json", OUT / "investigations.json")

    # Models: exported formulas + scores, copied as-is
    for f in ["model1_flame_survives.json", "model2_spread_rate.json", "model3_flex_burning.json", "metrics.json"]:
        shutil.copy2(ROOT / "models" / f, OUT / f)
    print("  models + metrics copied")


if __name__ == "__main__":
    main()
