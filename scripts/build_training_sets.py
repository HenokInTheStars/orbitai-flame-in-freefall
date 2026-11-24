"""Build the three training tables from cleaned data.

Run after clean_data.py:   python scripts/build_training_sets.py
Writes data/training/model1_flame_survives.csv, model2_spread_rate.csv, model3_flex_burning.csv

Rules (see models/MODEL_CARD.md):
- Only measured outcomes are used. Nothing is imputed.
- Each physical test comes from ONE source only (no double counting):
    BASS/BASS-II SIBAL tests  -> NTRS 20150008962 appendix (not PSI-25 again)
    BASS-II PMMA rod tests    -> Link et al. 2018 Table S1 (not PSI-25 again)
- Every row keeps source, test/sample ID (used as the cross-validation group) and a `flagged` column.
  Flagged rows are excluded by default and only used in the sensitivity check.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
OUT = ROOT / "data" / "training"

BASS_SRC = "NTRS 20150008962 (Zhao, T'ien, Ferkul, Olson 2015), Appendix"
LINK_SRC = "Link et al. 2018, Sci Rep 8:120, doi:10.1038/s41598-017-18398-4"
FLEX_SRC = "NASA PSI-69 FLEX experimental table, doi:10.60555/mbq8-0451"


def point(**kw):
    return kw


# ---------- Model 1: does the flame survive at this O2 / flow? ----------

def model1_rows():
    rows = []

    # (a) BASS / BASS-II SIBAL fabric, microgravity. One test can give two points:
    #     the start flow (flame established?) and the end flow (still burning?).
    bass = pd.read_csv(PROC / "ntrs" / "bass_bass2_sibal_flammability_boundary.csv")
    for _, r in bass.iterrows():
        o = r["outcome"]
        start, end = float(r["flow_start_cm_s"]), float(r["flow_end_cm_s"])
        if o == "no_ignition":
            labels = [(start, 0, "no ignition")]
        elif o in ("burned", "burning_no_blowoff"):
            labels = [(start, 1, "burning at start flow"), (end, 1, f"{o} at end flow")]
        elif o in ("quenched", "blowoff"):
            labels = [(start, 1, "burning at start flow"), (end, 0, f"{o} at end flow")]
        else:
            continue
        note = "" if pd.isna(r["notes"]) else str(r["notes"])
        # 'reused sample' = burned before; its outcome reflects sample condition, not just O2/flow
        flagged = ("inaccurate" in note) or ("verify" in note) or ("reused" in note)
        seen = set()
        for flow, y, why in labels:
            if (flow, y) in seen:  # start == end flow with same label -> one point, not two
                continue
            seen.add((flow, y))
            rows.append(point(source=BASS_SRC, group=f"{r['investigation']}-{r['test_id']}", test_id=r["test_id"],
                              fuel="SIBAL fabric (thin)", rod_d_cm=0.0, gravity="micro",
                              o2_percent=float(r["o2_percent"]), flow_cm_s=flow, label=y,
                              label_reason=why, flagged=flagged, flag_reason=note if flagged else ""))

    # (b) PMMA rods, Link 2018 Table S1 (ISS) - every printed row is a steady spreading flame.
    # (c) PMMA rods, Link 2018 Table S2 (Earth) - 'yes' / 'no' (printed '-') steady spread.
    link = pd.read_csv(PROC / "flame_spread_pmma_rods.csv")
    for _, r in link.iterrows():
        note = "" if pd.isna(r["notes"]) else str(r["notes"])
        flagged = "sources differ" in note
        group = f"Link-S1-{r['sample_as_printed']}" if r["table"] == "S1" else f"Link-S2-d{r['d_cm']}"
        rows.append(point(source=f"{LINK_SRC}, Table {r['table']}", group=group,
                          test_id=r["sample_as_printed"] if r["table"] == "S1" else f"S2 d={r['d_cm']}",
                          fuel="PMMA rod", rod_d_cm=float(r["d_cm"]), gravity=r["gravity"],
                          o2_percent=float(r["o2_percent"]), flow_cm_s=float(r["flow_cm_s"]),
                          label=1 if r["flame_spread"] == "yes" else 0,
                          label_reason="steady flame spread" if r["flame_spread"] == "yes" else "no steady spread",
                          flagged=flagged, flag_reason=note if flagged else ""))
    return pd.DataFrame(rows)


# ---------- Model 2: how fast does the flame spread? (PMMA rods, Link 2018) ----------

def model2_rows():
    link = pd.read_csv(PROC / "flame_spread_pmma_rods.csv")
    link = link[link["flame_spread"] == "yes"].copy()
    link["notes"] = link["notes"].fillna("")
    return pd.DataFrame({
        "source": LINK_SRC + ", Table " + link["table"],
        "group": np.where(link["table"] == "S1", "Link-S1-" + link["sample_as_printed"].astype(str),
                          "Link-S2-d" + link["d_cm"].astype(str)),
        "test_id": link["sample_as_printed"].fillna("S2"),
        "gravity": link["gravity"], "rod_d_cm": link["d_cm"], "o2_percent": link["o2_percent"],
        "flow_cm_s": link["flow_cm_s"], "spread_rate_mm_s": link["spread_rate_mm_s"],
        "flagged": link["notes"].str.contains("sources differ"),
        "flag_reason": np.where(link["notes"].str.contains("sources differ"), link["notes"], ""),
    })


# ---------- Model 3: FLEX droplet burning rate ----------

def model3_rows():
    recs = pd.DataFrame(json.loads((PROC / "records.json").read_text(encoding="utf-8")))
    flex = recs[recs["psi_id"] == "PSI-69"].copy()
    ex = flex["extra"]
    flex["burning_rate"] = ex.apply(lambda e: e["burning_rate_raw_header_unit_mm"])
    flex["co2_fraction"] = ex.apply(lambda e: e["co2_mole_fraction"] or 0.0)
    flex["he_fraction"] = ex.apply(lambda e: e["he_mole_fraction"] or 0.0)
    flex["droplet_d_mm"] = ex.apply(lambda e: e["droplet_initial_diameter_mm"])
    flex["notes"] = flex["notes"].fillna("")
    flex = flex[flex["burning_rate"].notna()]
    flagged = flex["pressure_kpa"].isna() | flex["notes"].str.contains("approximate")
    return pd.DataFrame({
        "source": FLEX_SRC, "group": "FLEX-" + flex["test_id"], "test_id": flex["test_id"],
        "fuel": flex["material_or_fuel"], "o2_percent": flex["o2_percent"], "pressure_kpa": flex["pressure_kpa"],
        "co2_fraction": flex["co2_fraction"], "he_fraction": flex["he_fraction"],
        "droplet_d_mm": flex["droplet_d_mm"],
        "burning_rate_as_reported": flex["burning_rate"],
        "flagged": flagged, "flag_reason": np.where(flagged, flex["notes"], ""),
    })


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, df, label in (("model1_flame_survives", model1_rows(), "label"),
                            ("model2_spread_rate", model2_rows(), "spread_rate_mm_s"),
                            ("model3_flex_burning", model3_rows(), "burning_rate_as_reported")):
        df.to_csv(OUT / f"{name}.csv", index=False)
        clean = df[~df["flagged"]]
        extra = ""
        if label == "label":
            extra = (f" | label 1: {int(clean.label.sum())}, label 0: {int((clean.label == 0).sum())}"
                     f" | by gravity/fuel: {clean.groupby(['gravity', 'fuel']).size().to_dict()}")
        print(f"{name:24} {len(df):4} rows ({int(df.flagged.sum())} flagged), "
              f"{clean['group'].nunique()} independent tests/groups{extra}")


if __name__ == "__main__":
    main()
