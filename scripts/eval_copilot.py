"""Score the SI Copilot against validation/copilot_eval.csv.

Needs the site running (cd web && pnpm build && pnpm start) with GEMINI_API_KEY set.
    python scripts/eval_copilot.py [base_url]        default http://localhost:3000

Checks, per question kind:
  answer         the reply cites at least one [n], does not open with "our sources don't cover", and a cited
                 source matches expected_source_any
                 (any of the ;-separated strings appears in the source title or reference)
  refuse         the reply says our sources don't cover it (no outside knowledge)
  no_prediction  the reply does not predict Moon/Mars behaviour; it says it is untested/unknown
Writes validation/copilot_eval_results.csv. Every run calls the Gemini API once per question.
The route allows 8 questions a minute per client, so the script waits between calls.
"""
import csv
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
WAIT_S = 8

REFUSAL = re.compile(r"(do(es)? not|don't|doesn't) (cover|contain|state|include|mention|answer|provide|address)|not (covered|stated|mentioned)|no information", re.I)
UNTESTED = re.compile(r"not (been )?(tested|measured)|untested|unknown|no (fire )?(test|data|measurement)|has not been|have not been|do not (cover|state|include)|don't (cover|know)|cannot (predict|say)", re.I)


def ask(question: str) -> dict:
    req = urllib.request.Request(
        f"{BASE}/api/copilot",
        data=json.dumps({"question": question}).encode(),
        headers={"content-type": "application/json"},
        method="POST",
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        data = {"error": json.load(e).get("error", str(e))}
    data["seconds"] = round(time.time() - t0, 1)
    data.setdefault("model", "")
    return data


def score(row: dict, res: dict) -> tuple[bool, str]:
    if "error" in res:
        return False, f"error: {res['error']}"
    answer = res.get("answer", "")
    # Citations look like [1] or grouped [1, 2, 5].
    cited = {n for group in re.findall(r"\[(\d+(?:\s*,\s*\d+)*)\]", answer) for n in re.findall(r"\d+", group)}
    sources = [s for s in res.get("sources", []) if s["id"] in cited]
    if row["kind"] == "answer":
        if not cited:
            return False, "no citation"
        if REFUSAL.search(answer.split(".")[0]):
            return False, "opens by saying the sources don't cover it"
        wanted = [w.strip().lower() for w in row["expected_source_any"].split(";") if w.strip()]
        hit = [s for s in sources if any(w in f"{s['title']} {s['ref']}".lower() for w in wanted)]
        return (True, f"cites {hit[0]['ref']}") if hit else (False, "cited sources: " + " | ".join(s["ref"] for s in sources))
    if row["kind"] == "refuse":
        return (True, "declined") if REFUSAL.search(answer) else (False, "answered from outside the sources")
    if row["kind"] == "no_prediction":
        return (True, "says untested") if UNTESTED.search(answer) else (False, "may have predicted")
    return False, f"unknown kind {row['kind']}"


def main() -> None:
    rows = list(csv.DictReader(open(ROOT / "validation/copilot_eval.csv", encoding="utf-8")))
    out = []
    for i, row in enumerate(rows):
        if i:
            time.sleep(WAIT_S)
        res = ask(row["question"])
        ok, why = score(row, res)
        print(f"{row['test_id']} {'PASS' if ok else 'FAIL'} ({res['seconds']} s, {res['model']}) {why}")
        out.append({**row, "passed": ok, "reason": why, "seconds": res["seconds"], "model": res["model"],
                    "answer": res.get("answer", res.get("error", ""))})
    path = ROOT / "validation/copilot_eval_results.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)
    passed = sum(r["passed"] for r in out)
    print(f"\n{passed}/{len(out)} passed. Results: {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
