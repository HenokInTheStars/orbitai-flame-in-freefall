"""Build the copilot's knowledge base: source-grounded text chunks with citations.

Run after export_web_data.py:   python scripts/build_knowledge_base.py
Writes knowledge_base/document_chunks.jsonl (for the repo) and web/data/kb.json (read by the API route).

Two kinds of chunks:
  1. "paper"  - text of each page of the PDFs in docs/papers/ (NASA reports = US Government works;
                Link et al. 2018 = CC BY 4.0; PSI overviews = NASA). private/ is never read.
  2. "data"   - short factual summaries generated from our cleaned tables, each citing its source.
No text is written by hand except the one-line headers that say where a summary comes from.
"""

import json
import re
from pathlib import Path

import pandas as pd
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
PAPERS = ROOT / "docs" / "papers"
WEBDATA = ROOT / "web" / "public" / "data"
OUT_JSONL = ROOT / "knowledge_base" / "document_chunks.jsonl"
OUT_WEB = ROOT / "web" / "data" / "kb.json"
MIN_CHARS = 200    # skip near-empty pages (title slides, figure-only pages)
MAX_CHARS = 3500   # long pages are split so one chunk stays focused


def tidy(text):
    text = text.replace("­", "").replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def ref_for(pdf: Path):
    m = re.search(r"NTRS-(\d{11})", pdf.name)
    if m:
        return f"NTRS {m.group(1)}", f"https://ntrs.nasa.gov/citations/{m.group(1)}"
    if "Link-2018" in pdf.name:
        return "Link et al. 2018, Sci Rep 8:120", "https://doi.org/10.1038/s41598-017-18398-4"
    if "NASA-STD-6001B" in pdf.name:
        return "NASA-STD-6001B", "https://standards.nasa.gov/"
    return f"NASA PSI overview: {pdf.stem}", "https://psi.nasa.gov/"


# Kept in docs/ as background, but not indexed: pages of numeric property tables that say nothing about
# fire safety. Copilot evaluation (validation/copilot_eval.csv, CP-14) showed the thermo tables, half of all
# chunks, led it to "answer" unrelated questions from them.
NOT_INDEXED = {"GAS_PROPERTIES"}


def paper_chunks():
    out = []
    for pdf in sorted(PAPERS.rglob("*.pdf")):
        if pdf.parent.name in NOT_INDEXED:
            continue
        ref, url = ref_for(pdf)
        title = pdf.stem.replace("_", " ")
        try:
            reader = PdfReader(str(pdf))
        except Exception as e:  # unreadable PDF: report, don't crash
            print(f"  skip {pdf.name}: {e}")
            continue
        for i, page in enumerate(reader.pages, start=1):
            try:
                text = tidy(page.extract_text() or "")
            except Exception:
                continue
            if len(text) < MIN_CHARS:
                continue
            parts = [text[j:j + MAX_CHARS] for j in range(0, len(text), MAX_CHARS)]
            for k, part in enumerate(parts):
                out.append({"chunk_id": f"{pdf.stem[:40]}-p{i}" + (f"-{k}" if len(parts) > 1 else ""),
                            "kind": "paper", "title": title, "ref": f"{ref}, p. {i}", "url": url,
                            "family": pdf.parent.name, "text": part})
    return out


def data_chunks():
    out = []

    def add(cid, title, ref, text):
        out.append({"chunk_id": cid, "kind": "data", "title": title, "ref": ref, "url": "", "family": "DATA", "text": text})

    mats = json.loads((WEBDATA / "materials_moc.json").read_text(encoding="utf-8"))["rows"]
    lines = [f"{m['material']} ({m['composition']}, {m['category']}): MOC {m['moc_qualifier'] if m['moc_qualifier'] != '=' else ''}"
             f"{m['moc_percent_o2']}% O2 at {m['pressure_psia']} psia" for m in mats]
    add("data-moc", "Maximum oxygen concentration (MOC) of 26 spacecraft materials, Earth test",
        "NTRS 20070018178, Tables 1-2",
        "MOC = highest O2 % at which the material still self-extinguishes in NASA-STD-6001 Test 1 (Earth gravity, "
        "quiescent air, 10.2 psia). Above it the material burns.\n" + "\n".join(lines))

    soak = json.loads((WEBDATA / "oxygen_soak.json").read_text(encoding="utf-8"))
    add("data-soak", "Time for materials to return to their MOC after 100% O2 exposure (calculated)",
        "NTRS 20100019472",
        "Diffusion calculations ('theoretical approximations'), not burn tests. The 30-min rule of thumb was 'not based on data'.\n"
        + "\n".join(f"{r['scenario']} | {r['material']} ({r['porosity']}): {r['time_to_moc_hours']} h to reach MOC {r['moc_percent_o2']}%"
                    for r in soak))

    pg = json.loads((WEBDATA / "partial_gravity.json").read_text(encoding="utf-8"))
    add("data-partial-g", "Partial (Lunar/Martian) gravity: everything measured, findings and FM2 plan",
        "NTRS 20250010653, 20260001966, 20040053567, 20260000646",
        "\n".join(f"[{r['kind']}] {r['material']} {r['spread_direction'] or ''} at {r['gravity_label']} ({r['platform']}): "
                  f"{r['quantity']} {r['value'] if r['value'] is not None else ''} {r['unit'] or ''}"
                  f"{' vs 1-g ' + str(r['value_1g']) if r['value_1g'] is not None else ''}. {r['notes'] or ''} ({r['source']}, p. {r['pdf_page']})"
                  for r in pg))

    hab = json.loads((WEBDATA / "habitats.json").read_text(encoding="utf-8"))["presets"]
    add("data-habitats", "Spacecraft and habitat cabin atmospheres", "NTRS 20150021491, pp. 4-6",
        "\n".join(f"{h['name']}: {h['pressure_psia']} psia, {h['o2_percent'] if h['o2_percent'] is not None else 'O2 % not stated'}% O2. {h['notes'] or ''}" for h in hab))

    rods = pd.read_json(WEBDATA / "pmma_rods.json")
    iss = rods[(rods.gravity == "micro") & (rods.flame_spread == "yes")]
    earth_no = rods[(rods.gravity == "earth") & (rods.flame_spread == "no")]
    add("data-rods", "PMMA rod flame spread on the ISS vs Earth", "Link et al. 2018, Tables S1-S2",
        f"ISS (BASS-II): {len(iss)} measurements, all with steady flame spread, lowest O2 {iss.o2_percent.min()}%. "
        f"Earth: {len(rods[rods.gravity == 'earth'])} conditions, {len(earth_no)} with no steady spread "
        f"(at O2 {', '.join(str(x) for x in sorted(earth_no.o2_percent.unique()))}%). "
        "Paper: in microgravity flames spread at 17% O2 while on Earth there was no spread at 18% and below for the rods "
        "tested in both; below about 19% O2 microgravity spread is faster.")

    metrics = json.loads((WEBDATA / "metrics.json").read_text(encoding="utf-8"))
    m1, m2, m3 = metrics["model1_flame_survives"], metrics["model2_spread_rate"], metrics["model3_flex_burning"]
    rounds = list(m1["per_round"].values())
    add("data-models", "OrbitAI Lab prediction models and their test scores", "models/metrics.json, models/MODEL_CARD.md",
        f"Model 1, the flame survival model (does a flame keep spreading on an Earth PMMA rod; logistic regression on O2 and rod size; "
        f"{m1['rows']} tests; tested by leaving out one rod size at a time, {len(rounds)} rounds): accuracy {m1['model']['accuracy']:.2f}, "
        f"balanced accuracy {m1['model']['balanced_accuracy']:.2f}, AUC {m1['model']['auc']:.2f} "
        f"(always guessing 'keeps burning' scores {m1['model']['always_majority_accuracy']:.2f}). Across the rounds it caught "
        f"{sum(r['flame_outs_caught'] for r in rounds)} of {sum(r['flame_outs'] for r in rounds)} flame-outs and gave "
        f"{sum(r['false_alarms'] for r in rounds)} false alarms. "
        f"Earth model 50% O2 line vs ISS lowest burning O2: {json.dumps(m1['earth_50pct_line_vs_iss_measured'])}. "
        f"Model 2, the flame spread rate model (ridge regression, PMMA rods on the ISS and on Earth, {m2['rows']} rows): "
        f"R2 {m2['model']['r2']:.2f}, MAE {m2['model']['mae_mm_s']} mm/s (predicting the average scores R2 {m2['baseline_mean']['r2']:.2f}). "
        f"Model 3, the FLEX droplet burning rate model (ridge regression, {m3['rows']} tests): R2 {m3['model']['r2']:.2f}; coefficients per unit {json.dumps(m3['coef_per_unit'])}. "
        "All are statistical models (scikit-learn), not fine-tuned language models. No microgravity survival model and no Moon/Mars model.")

    inv = json.loads((WEBDATA / "investigations.json").read_text(encoding="utf-8"))
    add("data-investigations", "NASA PSI investigations used", "NASA Physical Sciences Informatics",
        "\n".join(f"{k} {v['name']} ({v['title']}), platform {v['platform']}, {v['record_count']} cleaned records, doi:{v['doi']}" for k, v in inv.items()))
    return out


def main():
    chunks = data_chunks() + paper_chunks()
    OUT_JSONL.parent.mkdir(exist_ok=True)
    OUT_WEB.parent.mkdir(parents=True, exist_ok=True)
    with OUT_JSONL.open("w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps({**c, "verification_status": "source_text" if c["kind"] == "paper" else "generated_from_data"}, ensure_ascii=False) + "\n")
    OUT_WEB.write_text(json.dumps(chunks, ensure_ascii=False), encoding="utf-8")
    kinds = pd.Series([c["kind"] for c in chunks]).value_counts().to_dict()
    print(f"  {len(chunks)} chunks {kinds}; {OUT_WEB.stat().st_size / 1e6:.1f} MB -> {OUT_WEB}")


if __name__ == "__main__":
    main()
