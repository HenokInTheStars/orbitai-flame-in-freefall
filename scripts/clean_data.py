"""Clean NASA PSI "Experimental table" CSVs into one unified record list.

Run from the repo root:  python scripts/clean_data.py
Reads   data/raw/*.csv        (never modified)
Writes  data/processed/records.json, records.csv, investigations.json

Rules followed here (see README "Data cleaning"):
- Units and "~" are stripped from numbers; "~" sets approx=True in notes.
- Text outcomes ("Complete", "Acceleratory", "Insignificant", ...) are kept as
  text, never turned into numbers.
- Nothing is guessed. Blank or ambiguous source values become null, with a note.
- Investigation-specific fields that do not fit the shared schema go into `extra`.
"""

import json
import re
import shutil
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"

MMHG_TO_KPA = 0.133322  # 1 mmHg = 0.133322 kPa

# DOIs were looked up in the DataCite registry (prefix 10.60555 = NASA PSI).
# PSI-98 was cross-checked against the .bib file downloaded from PSI.
INVESTIGATIONS = {
    "PSI-99": {"name": "Saffire-II", "title": "Spacecraft Fire Experiment-II", "doi": "10.60555/2chp-m469",
               "file": "PSI-99_Experimental table_SAFFIRE-2.csv", "platform": "Cygnus cargo vehicle (after ISS departure)", "tier": 1},
    "PSI-25": {"name": "BASS-II", "title": "Burning and Suppression of Solids - II", "doi": "10.60555/4qc4-de67",
               "file": "PSI-25_Experimental table_BASS-II.csv", "platform": "ISS (Microgravity Science Glovebox)", "tier": 1},
    "PSI-69": {"name": "FLEX", "title": "Flame Extinguishment Experiment", "doi": "10.60555/mbq8-0451",
               "file": "PSI-69_Experimental table_FLEX.csv", "platform": "ISS (Combustion Integrated Rack)", "tier": 1},
    "PSI-98": {"name": "Saffire-I", "title": "Spacecraft Fire Safety Experiment-I", "doi": "10.60555/0t15-1z43",
               "file": "PSI-98_Experimental table_SAFFIRE-1.csv", "platform": "Cygnus cargo vehicle (after ISS departure)", "tier": 2},
    "PSI-100": {"name": "Saffire-III", "title": "Spacecraft Fire Experiment-III", "doi": "10.60555/040q-4h36",
                "file": "PSI-100_Experimental table_SAFFIRE-3.csv", "platform": "Cygnus cargo vehicle (after ISS departure)", "tier": 2},
}

SCHEMA = ["investigation", "psi_id", "doi", "test_id", "material_or_fuel", "geometry", "thickness_mm",
          "o2_percent", "pressure_kpa", "flow_cm_s", "flow_direction", "gravity", "ignited",
          "spread_rate_mm_s", "burn_length_cm", "extinction_note", "outcome", "notes", "source_file"]

NUM = r"(\d+(?:\.\d+)?|\.\d+)"


# ---------- small parsing helpers ----------

def clean_text(v):
    """Return a stripped string, or None for blanks / NaN."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s or None


def parse_number(v, unit=None):
    """'~ 21.5' -> (21.5, True); '20 cm/s' -> (20.0, False); 'n/a' -> (None, False).

    Only accepts a single number, optionally followed by `unit`. Anything else
    (ranges, notes, text outcomes) returns None so the caller can decide.
    """
    s = clean_text(v)
    if s is None:
        return None, False
    approx = s.startswith("~")
    s = s.lstrip("~ ").strip()
    pattern = rf"^{NUM}" + (rf"\s*{re.escape(unit)}" if unit else "") + r"$"
    m = re.match(pattern, s)
    return (float(m.group(1)), approx) if m else (None, False)


def parse_range_midpoint(v):
    """'22.1 to 22.0' or '21.5 - 21.7' -> midpoint (and the raw text for the note)."""
    s = clean_text(v)
    m = re.match(rf"^{NUM}\s*(?:to|-)\s*{NUM}$", s or "")
    if not m:
        return None
    a, b = float(m.group(1)), float(m.group(2))
    return round((a + b) / 2, 3)


def parse_o2(v, notes):
    value, approx = parse_number(v)
    if value is not None:
        if approx:
            notes.append(f"O2 given as approximate ('{clean_text(v)}')")
        return value
    mid = parse_range_midpoint(v)
    if mid is not None:
        notes.append(f"O2 given as range '{clean_text(v)}'; midpoint stored")
        return mid
    if clean_text(v):
        notes.append(f"O2 not parsed from '{clean_text(v)}'")
    return None


def record(**kw):
    rec = {k: None for k in SCHEMA}
    rec.update(kw)
    rec["notes"] = "; ".join(kw.get("notes") or []) or None
    return rec


def inv_fields(psi_id):
    inv = INVESTIGATIONS[psi_id]
    return {"investigation": inv["name"], "psi_id": psi_id, "doi": inv["doi"], "source_file": inv["file"]}


def psi_path(name):
    """PSI tables live in data/raw/psi/<FAMILY>/<PSI-ID_NAME>/<file>."""
    hits = list((RAW / "psi").rglob(name))
    if len(hits) != 1:
        raise FileNotFoundError(f"expected exactly one '{name}' under data/raw/psi, found {len(hits)}")
    return hits[0]


def read_csv(name):
    # PSI tables are a mix of UTF-8 (with BOM) and Windows-1252.
    path = psi_path(name)
    try:
        return pd.read_csv(path, encoding="utf-8-sig", dtype=str)
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="cp1252", dtype=str)


# ---------- Saffire-II (PSI-99): micro-g AND 1-g result per sample ----------

def saffire2_thickness(raw, notes):
    s = clean_text(raw)
    if s is None:
        return None
    m = re.match(r"^0(\d+) mm$", s)  # e.g. "037 mm": missing decimal point
    if m:
        value = float("0." + m.group(1))
        notes.append(f"thickness raw '{s}' read as {value} mm (missing decimal point; NTRS 20180005168 "
                     f"Table 1 lists these Saffire-II samples as 0.37 mm)")
        return value
    mm, _ = parse_number(s, "mm")
    if mm is not None:
        return mm
    cm, _ = parse_number(s, "cm")
    if cm is not None:
        return cm * 10
    notes.append(f"thickness not numeric in source ('{s}')")
    return None


def length_cm(raw, notes, label):
    """Burn length: '29 cm' -> 29, '~ 0' -> 0, '~ 10 cm (note 3)' -> 10. Text stays text."""
    s = clean_text(raw)
    if s is None:
        return None
    note = re.search(r"\((note \d)\)", s, re.I)
    core = re.sub(r"\(.*?\)", "", s).strip()
    value, approx = parse_number(core, "cm")
    if value is None:
        value, approx = parse_number(core)  # '~ 0' has no unit
    if value is None:
        notes.append(f"{label} not numeric in source ('{s}')")
    elif approx or note:
        notes.append(f"{label} raw '{s}'")
    return value


def rate_mm_s(raw, notes, label):
    s = clean_text(raw)
    if s is None:
        return None
    value, _ = parse_number(s, "mm/s")
    if value is None and s.lower() not in ("n/a",):
        notes.append(f"{label} raw '{s}'")
    return value


def clean_saffire2():
    psi = "PSI-99"
    df = read_csv(INVESTIGATIONS[psi]["file"])
    cols = list(df.columns)
    # The micro-g columns arrive as '?-g' because of a broken 'µ' in the source file.
    ug_burn = next(c for c in cols if "-g Burn Length" in c and not c.startswith("1"))
    ug_spread = next(c for c in cols if "-g Spread Length" in c)
    thick_col = next(c for c in cols if "Thickness" in c)  # header typo 'Samle Thickness'

    footnotes = [clean_text(v) for v in df["Sample Number"] if clean_text(v) and clean_text(v).lower().startswith("note")]
    rows = df[df["Sample Number"].astype(str).str.match(r"^\d+-\d+$")]

    out = []
    for _, r in rows.iterrows():
        base_notes = []
        material = clean_text(r["Material"])
        if material is None:
            base_notes.append("material blank in source table")
        thickness = saffire2_thickness(r[thick_col], base_notes)
        o2 = parse_o2(r["Percent O2 (Note 1)"], base_notes)
        flow, _ = parse_number(r["Air Flow (cm/s)"], "cm/s")
        common = dict(**inv_fields(psi), test_id=r["Sample Number"], material_or_fuel=material,
                      geometry="thin sheet", thickness_mm=thickness, flow_direction=clean_text(r["Flow Direction"]))

        composite = material is not None and "&" in material

        # Microgravity result (flown on Cygnus)
        n = list(base_notes)
        burn_time = clean_text(r["Burn Time (s)"])
        burn_len = length_cm(r[ug_burn], n, "µg burn length")
        spread = rate_mm_s(r[ug_spread], n, "µg spread")
        ignited = None
        if composite:
            n.append("composite sample; ignition outcome differs by component")
        elif burn_len is not None:
            ignited = burn_len > 0
        n.append(f"burn time: {burn_time}")
        out.append(record(**common, gravity="micro", o2_percent=o2, flow_cm_s=flow,
                          burn_length_cm=burn_len, spread_rate_mm_s=spread, ignited=ignited,
                          outcome="Insignificant burn" if burn_time == "Insignificant" else None, notes=n,
                          extra={"ignition_power_W": parse_number(r["Ignition Power (W)"], "W")[0],
                                 "ignition_time_s": parse_number(r["Ignition Time (s)"], "s")[0],
                                 "burn_time_raw": burn_time,
                                 "ug_burn_length_raw": clean_text(r[ug_burn]),
                                 "ug_spread_raw": clean_text(r[ug_spread])}))

        # Earth-gravity (1-g) comparison result from the same table
        n = list(base_notes)
        n.append("1-g comparison test; its O2/flow conditions are not given in this table")
        g_burn_raw, g_spread_raw = clean_text(r["1-g Burn Length"]), clean_text(r["1-g Spread Rate"])
        g_burn = None if g_burn_raw == "Complete" else length_cm(g_burn_raw, n, "1-g burn length")
        g_spread = None if g_spread_raw == "Acceleratory" else rate_mm_s(g_spread_raw, n, "1-g spread")
        outcome_bits = [x for x in (g_burn_raw if g_burn_raw == "Complete" else None,
                                    g_spread_raw if g_spread_raw == "Acceleratory" else None) if x]
        if composite:
            g_ignited = None
        elif g_burn_raw == "Complete":
            g_ignited = True
        elif g_burn is not None:
            g_ignited = g_burn > 0
        else:
            g_ignited = None
        out.append(record(**common, gravity="earth", burn_length_cm=g_burn, spread_rate_mm_s=g_spread,
                          ignited=g_ignited, outcome=" / ".join(outcome_bits) or None, notes=n,
                          extra={"g_burn_length_raw": g_burn_raw, "g_spread_rate_raw": g_spread_raw}))
    return out, footnotes


# ---------- Saffire-I (PSI-98) and Saffire-III (PSI-100): large-scale flights ----------

def clean_saffire_large(psi):
    df = read_csv(INVESTIGATIONS[psi]["file"])
    df.columns = [c.strip() for c in df.columns]
    rows = df[df["Sample Number"].astype(str).str.strip().str.match(r"^S\d+$")]
    out = []
    for _, r in rows.iterrows():
        notes = []
        if psi == "PSI-98":
            thickness = parse_number(r["Sample Thickness (cm)"])[0]
            flow = parse_number(r["Air Flow (cm/s)"])[0]
            o2 = parse_o2(r["Percent O2"], notes)
            direction = clean_text(r["Flow Direction"])
            extra = {"burn_time_s": parse_number(r["Burn Time (s)"])[0],
                     "ignition_power_W": parse_number(r["Ignition Power (W)"])[0],
                     "sample_size_cm": f"{clean_text(r['Sample Length (cm)'])} x {clean_text(r['Sample Width (cm)'])}"}
        else:  # PSI-100 has units inside values and no O2 column
            thickness = parse_number(r["Sample Thickness"], "cm")[0]
            flow = parse_number(r["Air Flow"], "cm/s")[0]
            o2 = None
            notes.append("O2 not reported in this table")
            notes.append(f"flow conflict: this table says {flow:g} cm/s, NTRS 20180005168 Table 1 and "
                         "NTRS 20210011521 say 25 cm/s for both Saffire-III samples - sources disagree, both kept")
            direction = clean_text(r["Direction"])
            extra = {"sample_size": f"{clean_text(r['Sample Length'])} x {clean_text(r['Sample Width'])}",
                     "flow_cm_s_ntrs": 25.0, "flow_conflict": True}
        # NASA's Saffire paper lists every SIBAL sample (Saffire I-III) as 0.37 mm thick, so the PSI tables'
        # '0.37 cm' / '.33 cm' look like a unit slip. Not changed silently: table value kept, NTRS value added.
        notes.append("thickness conflict: this table gives the value in cm; NTRS 20180005168 Table 1 lists "
                     "SIBAL as 0.37 mm - possible unit error in the PSI table, both kept")
        extra["thickness_mm_ntrs"] = 0.37
        burn_time = extra.get("burn_time_s")
        out.append(record(**inv_fields(psi), test_id=clean_text(r["Sample Number"]),
                          material_or_fuel=clean_text(r["Material"]), geometry="large sheet",
                          thickness_mm=round(thickness * 10, 3) if thickness is not None else None,
                          ignited=True if burn_time else None,
                          o2_percent=o2, flow_cm_s=flow, flow_direction=direction, gravity="micro",
                          notes=notes, extra=extra))
    return out


# ---------- BASS-II (PSI-25) ----------

def bass_geometry(text):
    t = text.lower()
    for word, geom in (("candle", "candle"), ("rod", "rod"), ("spher", "sphere"), ("slab", "slab"),
                       ("film", "thin film"), ("sibal", "fabric strip"), ("nomex", "fabric strip")):
        if word in t:
            return geom
    if re.search(r"mm thick|micron", t):
        return "flat sample"
    return None


def bass_thickness_mm(text):
    """Only explicit thicknesses: '100 micron', '0.2 mm PMMA film', '5 mm thick'. Rods/spheres -> None."""
    t = text.lower()
    m = re.search(rf"{NUM}\s*micron", t)
    if m:
        return float(m.group(1)) / 1000
    m = re.search(rf"{NUM}\s*mm\b", t)
    if m and ("thick" in t or "film" in t):
        return float(m.group(1))
    return None


def bass_material(text):
    t = text.lower()
    for word, name in (("pmma", "PMMA"), ("sibal", "SIBAL (cotton-fiberglass)"), ("nomex", "Nomex"),
                       ("wax", "Japan wax")):
        if word in t:
            return name
    return None


def clean_bass2():
    psi = "PSI-25"
    df = read_csv(INVESTIGATIONS[psi]["file"])
    df.columns = [re.sub(r"\s+", " ", c).strip() for c in df.columns]
    out = []
    for _, r in df.iterrows():
        if clean_text(r["Test #"]) is None:
            continue
        notes = ["flow is a fan/air display setting, NOT cm/s (conversion TODO from BASS-II science documents)"]
        raw_material = clean_text(r["Fuel Sample Material"]) or ""
        material = bass_material(raw_material)
        if material is None:
            notes.append(f"material not named in source text '{raw_material}'")
        o2, _ = parse_number(r["Calibrated initial O2 % by vol"])
        out.append(record(**inv_fields(psi), test_id=clean_text(r["Test #"]),
                          material_or_fuel=material, geometry=bass_geometry(raw_material),
                          thickness_mm=bass_thickness_mm(raw_material), o2_percent=o2, gravity="micro",
                          notes=notes,
                          extra={"sample_description_raw": raw_material,
                                 "pi": clean_text(r["PI"]), "date": clean_text(r["Date"]),
                                 "gmt": clean_text(r["GMT"]),
                                 "flow_restrictor": clean_text(r["Flow restrictor"]),
                                 "fan_display_raw": clean_text(r["Fan display"]),
                                 "air_display_raw": clean_text(r["Air display"]),
                                 "final_o2_percent_raw": clean_text(r["Calibrated final O2 % by vol"]),
                                 "initial_co2_percent_raw": clean_text(r["Initial CO2 % by vol"]),
                                 "final_co2_percent_raw": clean_text(r["Final CO2 % by vol"]),
                                 "initial_co_ppm_raw": clean_text(r["Initial CO (ppm)"]),
                                 "final_co_ppm_raw": clean_text(r["Final CO (ppm)"])}))
    return out


# ---------- BASS-II flow in cm/s from the published NTRS appendix ----------

NTRS = RAW / "ntrs"
BASS_PAPER = "NTRS 20150008962 (Zhao, T'ien, Ferkul, Olson 2015), Appendix"
PAPER_OUTCOME_IGNITED = {"burned": True, "burning_no_blowoff": True, "quenched": True,
                         "blowoff": True, "no_ignition": False}


def add_bass2_paper_flows(records):
    """BASS-II PSI table only has fan/air display settings. For the SIBAL tests, the paper's
    appendix gives flow in cm/s and an outcome. We match on test # AND check that the GMT day and
    initial O2 agree with the PSI table before copying anything across."""
    paper = pd.read_csv(NTRS / "bass_bass2_sibal_flammability_boundary.csv")
    paper = paper[paper["investigation"] == "BASS-II"]
    by_test = {r["test_id"]: r for r in records if r["psi_id"] == "PSI-25"}
    matched = 0
    for _, p in paper.iterrows():
        gmt, test = p["test_id"].split("-", 1)
        rec = by_test.get(test)
        if rec is None or f"GMT{rec['extra']['gmt']}" != gmt or abs(rec["o2_percent"] - p["o2_percent"]) > 0.05:
            print(f"  WARNING: {p['test_id']} not matched to PSI-25, skipped")
            continue
        rec["flow_cm_s"] = float(p["flow_start_cm_s"])
        rec["flow_direction"] = p["flow_direction"]
        rec["outcome"] = p["outcome"]
        rec["ignited"] = PAPER_OUTCOME_IGNITED.get(p["outcome"])
        rec["extra"]["flow_end_cm_s"] = float(p["flow_end_cm_s"])
        rec["extra"]["flow_source"] = BASS_PAPER
        paper_note = "" if pd.isna(p["notes"]) else f"; paper note: {p['notes']}"
        rec["notes"] = (f"flow_cm_s = flow at start of test, from {BASS_PAPER} (end flow "
                        f"{p['flow_end_cm_s']} cm/s); outcome from same paper{paper_note}")
        matched += 1
    print(f"  BASS-II: {matched} tests given cm/s flow from the NTRS appendix")


# ---------- FLEX (PSI-69): droplet combustion ----------

def clean_flex():
    psi = "PSI-69"
    df = read_csv(INVESTIGATIONS[psi]["file"])
    c = {k: next(col for col in df.columns if col.startswith(k)) for k in
         ("Ambient pressure", "O initial", "N initial", "CO initial", "He initial", "Droplet initial",
          "Visible flame", "Burning rate", "Burn time")}
    out = []
    for _, r in df.iterrows():
        notes = []
        p_mmhg, _ = parse_number(r[c["Ambient pressure"]])
        if p_mmhg == 0:
            notes.append("source pressure is 0 mmHg (implausible for a burning test); stored as null")
            p_mmhg = None
        o2_frac, _ = parse_number(r[c["O initial"]])
        burn_time, bt_approx = parse_number(r[c["Burn time"]])
        if bt_approx:
            notes.append(f"burn time approximate ('{clean_text(r[c['Burn time']])}')")
        ext_d, _ = parse_number(r[c["Visible flame"]])
        out.append(record(**inv_fields(psi), test_id=clean_text(r["FLEX Identifier"]),
                          material_or_fuel=clean_text(r["Fuel"]), geometry="droplet",
                          o2_percent=round(o2_frac * 100, 2) if o2_frac is not None else None,
                          pressure_kpa=round(p_mmhg * MMHG_TO_KPA, 2) if p_mmhg is not None else None,
                          gravity="micro", ignited=True if burn_time else None,
                          extinction_note=f"visible flame extinction diameter {ext_d} mm" if ext_d is not None else None,
                          outcome=clean_text(r["Test end"]), notes=notes,
                          extra={"pressure_mmHg_raw": clean_text(r[c["Ambient pressure"]]),
                                 "n2_mole_fraction": parse_number(r[c["N initial"]])[0],
                                 "co2_mole_fraction": parse_number(r[c["CO initial"]])[0],
                                 "he_mole_fraction": parse_number(r[c["He initial"]])[0],
                                 "droplet_initial_diameter_mm": parse_number(r[c["Droplet initial"]])[0],
                                 "extinction_diameter_mm": ext_d,
                                 # Header says 'mm'; droplet burning-rate constants are normally mm^2/s.
                                 # Kept raw until verified against FLEX documentation.
                                 "burning_rate_raw_header_unit_mm": parse_number(r[c["Burning rate"]])[0],
                                 "burn_time_s": burn_time}))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    saffire2, saffire2_notes = clean_saffire2()
    bass2 = clean_bass2()
    add_bass2_paper_flows(bass2)
    records = saffire2 + bass2 + clean_flex() + clean_saffire_large("PSI-98") + clean_saffire_large("PSI-100")

    # NTRS tables are already tidy (transcribed by the team); copy them so the app reads one folder.
    (OUT / "ntrs").mkdir(exist_ok=True)
    for f in NTRS.glob("*.csv"):
        shutil.copy2(f, OUT / "ntrs" / f.name)

    # Flame spread vs O2 on PMMA rods, ISS (Table S1) and Earth (Table S2), Link et al. 2018 (CC BY 4.0).
    spread = pd.read_csv(RAW / "literature" / "link2018_pmma_rod_flame_spread.csv")
    spread["spread_rate_mm_s"] = (spread["vf_x1e3_cm_s_as_printed"] * 0.01).round(5)  # Vf x1e3 cm/s -> mm/s
    spread["source"] = "Link et al. 2018, Sci Rep 8:120, doi:10.1038/s41598-017-18398-4, Supplementary " + spread["table"]
    spread.to_csv(OUT / "flame_spread_pmma_rods.csv", index=False)
    print(f"  flame spread table: {len(spread)} rows "
          f"({(spread.gravity == 'micro').sum()} ISS, {(spread.gravity == 'earth').sum()} Earth)")

    (OUT / "records.json").write_text(json.dumps(records, indent=1, ensure_ascii=False), encoding="utf-8")

    flat = pd.DataFrame(records)
    flat["extra"] = flat["extra"].apply(lambda d: json.dumps(d, ensure_ascii=False))
    flat.to_csv(OUT / "records.csv", index=False, encoding="utf-8")

    meta = {psi: {**inv, "url": f"https://psi.nasa.gov/physci/repo/data/investigations/{psi}",
                  "doi_url": f"https://doi.org/{inv['doi']}",
                  "record_count": sum(1 for r in records if r["psi_id"] == psi)}
            for psi, inv in INVESTIGATIONS.items()}
    meta["PSI-99"]["table_footnotes"] = saffire2_notes
    (OUT / "investigations.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False), encoding="utf-8")

    for psi, m in meta.items():
        print(f"{psi:8} {m['name']:12} {m['record_count']:4} records")
    print(f"total    {len(records)} records -> {OUT}")


if __name__ == "__main__":
    main()
