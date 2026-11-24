"""Train and evaluate three small, transparent models with scikit-learn.

Run after build_training_sets.py:   python scripts/train_models.py
Writes models/model1_flame_survives.json, model2_spread_rate.json, model3_flex_burning.json
and models/metrics.json (read by the model card).

Evaluation: out-of-fold predictions from GroupKFold, where every point from the same test/sample
stays on the same side of the split, so the model is always scored on tests it never saw.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, mean_absolute_error,
                             r2_score, roc_auc_score)
from sklearn.model_selection import GroupKFold, LeaveOneGroupOut, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
TRAIN = ROOT / "data" / "training"
OUT = ROOT / "models"
FOLDS = 5


# ---------- features (kept tiny and physical, so the team can explain each one) ----------

def m1_features(d):
    # Shipped Model 1 = Earth-gravity PMMA rods only (see MODEL_CARD.md for why)
    return pd.DataFrame({
        "o2_percent": d["o2_percent"],
        "inv_rod_d": 1.0 / d["rod_d_cm"],                    # thinner rods burn more easily (Link 2018)
    })


def m1_combined_features(d):
    # Rejected variant: one model for all conditions
    return pd.DataFrame({
        "o2_percent": d["o2_percent"], "log_flow": np.log(d["flow_cm_s"]),
        "is_micro": (d["gravity"] == "micro").astype(float),
        "is_pmma_rod": (d["fuel"] == "PMMA rod").astype(float), "rod_d_cm": d["rod_d_cm"],
    })


def m1_sibal_features(d):
    # Rejected variant: SIBAL microgravity, flame-out flow depends on O2 (interaction term)
    lf = np.log(d["flow_cm_s"])
    return pd.DataFrame({"o2_percent": d["o2_percent"], "log_flow": lf, "o2_x_log_flow": d["o2_percent"] * lf})


def m2_features(d):
    micro = (d["gravity"] == "micro").astype(float)
    return pd.DataFrame({
        "o2_percent": d["o2_percent"],
        "log_flow": np.log(d["flow_cm_s"]),
        "inv_rod_d": 1.0 / d["rod_d_cm"],                    # thinner rods spread faster (Link 2018 Fig. 7)
        "is_micro": micro,
        "micro_x_o2": micro * d["o2_percent"],              # O2 effect differs between µg and Earth (Fig. 8)
    })


def m3_features(d):
    return pd.DataFrame({
        "o2_percent": d["o2_percent"],
        "pressure_kpa": d["pressure_kpa"],
        "co2_fraction": d["co2_fraction"],
        "he_fraction": d["he_fraction"],
        "is_heptane": (d["fuel"] == "Heptane").astype(float),
        # FLEX overview: initial droplet size causes transient, non-quasi-steady burning (PSI FLEX overview p. 2)
        "droplet_d_mm": d["droplet_d_mm"],
    })


def m3_features_without_diameter(d):
    # Previous Model 3 inputs, kept so the gain from adding droplet diameter stays reproducible
    return m3_features(d).drop(columns=["droplet_d_mm"])


def cv(groups):
    return GroupKFold(n_splits=FOLDS, shuffle=True, random_state=0) if groups.nunique() > FOLDS else None


def export(pipe, cols, path, extra):
    scaler, model = pipe[0], pipe[-1]
    coef = np.ravel(model.coef_)
    intercept = float(np.ravel(model.intercept_)[0])
    path.write_text(json.dumps({
        "features": cols,
        "scaler_mean": scaler.mean_.round(6).tolist(),
        "scaler_scale": scaler.scale_.round(6).tolist(),
        "coefficients_standardized": coef.round(6).tolist(),
        "intercept": round(intercept, 6),
        "formula": extra.pop("formula"),
        **extra,
    }, indent=1), encoding="utf-8")


def valid_ranges(d, by, cols):
    out = {}
    for key, g in d.groupby(by):
        key = " / ".join(map(str, key if isinstance(key, tuple) else (key,)))
        out[key] = {c: [round(float(g[c].min()), 3), round(float(g[c].max()), 3)] for c in cols}
    return out


# ---------- Model 1 ----------

def logit():
    return make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", C=1.0, max_iter=3000))


def score_classifier(X, y, g, cv_obj):
    p = cross_val_predict(logit(), X, y, groups=g, cv=cv_obj, method="predict_proba")[:, 1]
    majority = max(y.mean(), 1 - y.mean())
    return p, {"accuracy": accuracy_score(y, p > 0.5), "balanced_accuracy": balanced_accuracy_score(y, p > 0.5),
               "auc": roc_auc_score(y, p), "always_majority_accuracy": majority}


def train_model1(include_flagged=False):
    """Shipped: Earth-gravity PMMA rods. Tested leave-one-rod-diameter-out (4 diameters)."""
    d = pd.read_csv(TRAIN / "model1_flame_survives.csv")
    if not include_flagged:
        d = d[~d["flagged"]]
    d = d[(d["gravity"] == "earth") & (d["fuel"] == "PMMA rod")]
    X, y, g = m1_features(d), d["label"].values, d["group"]
    p, scores = score_classifier(X, y, g, LeaveOneGroupOut())
    _, o2only = score_classifier(X[["o2_percent"]], y, g, LeaveOneGroupOut())
    # One line per test round: which flame-outs were caught, and what kind of mistakes were made
    rounds = {}
    for d_cm in sorted(d["rod_d_cm"].unique()):
        k = (d["rod_d_cm"] == d_cm).values
        pred = p[k] > 0.5
        rounds[f"{d_cm} cm held out"] = {
            "rows": int(k.sum()), "accuracy": float((pred == y[k]).mean()),
            "flame_outs": int((y[k] == 0).sum()), "flame_outs_caught": int(((~pred) & (y[k] == 0)).sum()),
            "false_alarms": int(((~pred) & (y[k] == 1)).sum()), "missed_flame_outs": int((pred & (y[k] == 0)).sum())}
    m = {"scope": "Earth gravity (1-g), black PMMA rods, opposed flow 2 or 25 cm/s (Link 2018 Table S2)",
         "rows": int(len(d)), "independent_groups": int(g.nunique()), "label_1": int(y.sum()), "label_0": int((y == 0).sum()),
         "cv": "leave-one-rod-diameter-out", "model": scores, "o2_only_model": o2only, "per_round": rounds}
    return d, X, logit().fit(X, y), m


def rejected_model1_variants():
    """Recorded so the decision is reproducible - these are NOT exported to the dashboard."""
    d = pd.read_csv(TRAIN / "model1_flame_survives.csv")
    d = d[~d["flagged"]]
    out = {}
    X, y, g = m1_combined_features(d), d["label"].values, d["group"]
    p, s = score_classifier(X, y, g, GroupKFold(n_splits=FOLDS, shuffle=True, random_state=0))
    per = {f"{k[0]} / {k[1]}": round(accuracy_score(y[d.index.get_indexer(i)], p[d.index.get_indexer(i)] > 0.5), 3)
           for k, i in d.groupby(["gravity", "fuel"]).groups.items()}
    out["combined_all_conditions"] = {**s, "accuracy_by_condition": per,
                                      "why_rejected": "high overall score comes from microgravity PMMA rows that are all "
                                                      "'burned'; weak (~0.6) inside the conditions that contain flame-outs"}
    sib = d[d["fuel"].str.startswith("SIBAL")]
    _, s = score_classifier(m1_sibal_features(sib), sib["label"].values, sib["group"], LeaveOneGroupOut())
    out["sibal_microgravity_o2_x_flow"] = {**s, "rows": int(len(sib)), "label_0": int((sib.label == 0).sum()),
                                           "why_rejected": "does not beat always-guessing-'burns' accuracy; "
                                                           "show the measured flow-vs-O2 map instead"}
    return out


# ---------- Model 2 ----------

def train_model2(include_flagged=False):
    d = pd.read_csv(TRAIN / "model2_spread_rate.csv")
    if not include_flagged:
        d = d[~d["flagged"]]
    X, y, g = m2_features(d), d["spread_rate_mm_s"].values, d["group"]
    make = lambda: make_pipeline(StandardScaler(), Ridge(alpha=1.0))
    p = cross_val_predict(make(), X, y, groups=g, cv=cv(g))
    b = cross_val_predict(DummyRegressor(), X, y, groups=g, cv=cv(g))
    m = {"rows": int(len(d)), "independent_tests": int(g.nunique()),
         "model": {"mae_mm_s": mean_absolute_error(y, p), "r2": r2_score(y, p)},
         "baseline_mean": {"mae_mm_s": mean_absolute_error(y, b), "r2": r2_score(y, b)},
         "target_range_mm_s": [float(y.min()), float(y.max())]}
    return d, X, make().fit(X, y), m


# ---------- Model 3 ----------

def train_model3(include_flagged=False):
    d = pd.read_csv(TRAIN / "model3_flex_burning.csv")
    if not include_flagged:
        d = d[~d["flagged"]]
    d = d.dropna(subset=["pressure_kpa", "droplet_d_mm"])
    X, y, g = m3_features(d), d["burning_rate_as_reported"].values, d["group"]
    make = lambda: make_pipeline(StandardScaler(), Ridge(alpha=1.0))
    p = cross_val_predict(make(), X, y, groups=g, cv=cv(g))
    b = cross_val_predict(DummyRegressor(), X, y, groups=g, cv=cv(g))
    p_old = cross_val_predict(make(), m3_features_without_diameter(d), y, groups=g, cv=cv(g))
    m = {"rows": int(len(d)), "independent_tests": int(g.nunique()),
         "model": {"mae": mean_absolute_error(y, p), "r2": r2_score(y, p)},
         "baseline_mean": {"mae": mean_absolute_error(y, b), "r2": r2_score(y, b)},
         "without_droplet_diameter": {"mae": mean_absolute_error(y, p_old), "r2": r2_score(y, p_old)}}
    return d, X, make().fit(X, y), m


def raw_coef(pipe, cols):
    """Coefficient per ORIGINAL unit (e.g. per 1% O2), for the physics check and the model card."""
    s = pipe[0].scale_
    return {c: float(v / sc) for c, v, sc in zip(cols, np.ravel(pipe[-1].coef_), s)}


def rnd(x):
    if isinstance(x, dict):
        return {k: rnd(v) for k, v in x.items()}
    return round(x, 4) if isinstance(x, float) else x


def main():
    OUT.mkdir(exist_ok=True)
    report, checks = {}, []

    # Model 1
    d1, X1, pipe1, m1 = train_model1()
    c1 = raw_coef(pipe1, list(X1.columns))
    checks.append(("Model 1: more O2 -> higher survival chance", c1["o2_percent"] > 0))
    _, _, pipe1f, m1f = train_model1(include_flagged=True)
    m1["sensitivity_with_flagged_rows"] = {"rows": m1f["rows"], **m1f["model"],
                                           "o2_coef_per_pct": raw_coef(pipe1f, list(X1.columns))["o2_percent"]}
    m1["coef_per_unit"] = c1
    # Earth model's 50% line per rod diameter, next to the lowest O2 where the SAME rod size burned on the ISS.
    link = pd.read_csv(ROOT / "data" / "processed" / "flame_spread_pmma_rods.csv")
    iss = link[(link.gravity == "micro") & (link.flame_spread == "yes")].groupby("d_cm").o2_percent.min()
    lines = {}
    grid = np.round(np.arange(15.0, 22.01, 0.05), 2)
    for d_cm in sorted(d1.rod_d_cm.unique()):
        prob = pipe1.predict_proba(m1_features(pd.DataFrame({"o2_percent": grid, "rod_d_cm": d_cm})))[:, 1]
        cross = float(grid[np.argmax(prob >= 0.5)]) if (prob >= 0.5).any() else None
        lines[f"{d_cm} cm"] = {"earth_model_o2_at_50pct": cross,
                               "iss_lowest_o2_with_flame_spread_measured": float(iss[d_cm]) if d_cm in iss.index else None}
    m1["earth_50pct_line_vs_iss_measured"] = lines
    m1["rejected_variants"] = rejected_model1_variants()
    m1["microgravity_statement"] = ("No model for microgravity PMMA: all 51 ISS rows (Link 2018 Table S1) show flame "
                                    "spread, down to 16.8% O2; extinction points were not tabulated in the paper.")
    export(pipe1, list(X1.columns), OUT / "model1_flame_survives.json", {
        "name": "Flame survives on Earth? PMMA rods (logistic regression)",
        "scope": m1["scope"],
        "formula": "p = 1 / (1 + exp(-(intercept + sum(coef_i * (x_i - mean_i) / scale_i))))",
        "valid_ranges": {"o2_percent": [float(d1.o2_percent.min()), float(d1.o2_percent.max())],
                         "rod_d_cm": [float(d1.rod_d_cm.min()), float(d1.rod_d_cm.max())]},
        "earth_50pct_line_vs_iss_measured": lines,
        "label": "model estimate, not a measurement"})
    report["model1_flame_survives"] = m1

    # Model 2
    d2, X2, pipe2, m2 = train_model2()
    c2 = raw_coef(pipe2, list(X2.columns))
    checks.append(("Model 2: more O2 -> faster spread (Earth)", c2["o2_percent"] > 0))
    checks.append(("Model 2: more O2 -> faster spread (microgravity)", c2["o2_percent"] + c2["micro_x_o2"] > 0))
    checks.append(("Model 2: thinner rod -> faster spread", c2["inv_rod_d"] > 0))
    _, _, pipe2f, m2f = train_model2(include_flagged=True)
    m2["sensitivity_with_flagged_rows"] = {"rows": m2f["rows"], **m2f["model"]}
    m2["coef_per_unit"] = c2
    export(pipe2, list(X2.columns), OUT / "model2_spread_rate.json", {
        "name": "Flame spread rate over PMMA rods (ridge regression)", "unit": "mm/s",
        "formula": "rate = intercept + sum(coef_i * (x_i - mean_i) / scale_i)",
        "valid_ranges": valid_ranges(d2, ["gravity"], ["o2_percent", "flow_cm_s", "rod_d_cm"]),
        "label": "model estimate, not a measurement"})
    report["model2_spread_rate"] = m2

    # Model 3
    d3, X3, pipe3, m3 = train_model3()
    c3 = raw_coef(pipe3, list(X3.columns))
    checks.append(("Model 3: more O2 -> faster burning", c3["o2_percent"] > 0))
    _, _, pipe3f, m3f = train_model3(include_flagged=True)
    m3["sensitivity_with_flagged_rows"] = {"rows": m3f["rows"], **m3f["model"]}
    m3["coef_per_unit"] = c3
    export(pipe3, list(X3.columns), OUT / "model3_flex_burning.json", {
        "name": "FLEX droplet burning rate (ridge regression)",
        "unit": "as reported in PSI-69 column 'Burning rate; mm' - unit not yet verified (likely mm^2/s)",
        "formula": "rate = intercept + sum(coef_i * (x_i - mean_i) / scale_i)",
        "valid_ranges": valid_ranges(d3, ["fuel"], ["o2_percent", "pressure_kpa", "co2_fraction", "he_fraction",
                                                    "droplet_d_mm"]),
        "label": "model estimate, not a measurement"})
    report["model3_flex_burning"] = m3

    report["physics_checks"] = {name: bool(ok) for name, ok in checks}
    (OUT / "metrics.json").write_text(json.dumps(rnd(report), indent=1), encoding="utf-8")

    # ---- console summary ----
    print("MODEL 1  flame survives on Earth (PMMA rods)", f"{m1['rows']} rows / {m1['independent_groups']} rod sizes "
          f"(1: {m1['label_1']}, 0: {m1['label_0']}), {m1['cv']}")
    for k in ("model", "o2_only_model"):
        print(f"   {k:22}", {a: round(b, 3) for a, b in m1[k].items()})
    for k, v in lines.items():
        print(f"   rod {k:8} Earth model 50% line: {v['earth_model_o2_at_50pct']}% O2 | ISS measured flame spread down to: "
              f"{v['iss_lowest_o2_with_flame_spread_measured']}% O2")
    for k, v in m1["per_round"].items():
        print(f"   round: {k:16} accuracy {v['accuracy']:.2f} | flame-outs caught {v['flame_outs_caught']}/{v['flame_outs']}"
              f" | false alarms {v['false_alarms']}")
    print("   with flagged rows:", {a: round(b, 3) for a, b in m1["sensitivity_with_flagged_rows"].items()})
    for k, v in m1["rejected_variants"].items():
        print(f"   REJECTED {k}: bal_acc {v['balanced_accuracy']:.2f} auc {v['auc']:.2f} acc {v['accuracy']:.2f} "
              f"(majority {v['always_majority_accuracy']:.2f}) - {v['why_rejected'][:70]}")
    print("   coef per unit:", {a: round(b, 3) for a, b in c1.items()})
    print("MODEL 2  spread rate      ", f"{m2['rows']} rows / {m2['independent_tests']} groups, "
          f"target {m2['target_range_mm_s']} mm/s")
    print("   model   ", {a: round(b, 4) for a, b in m2["model"].items()}, " baseline", {a: round(b, 4) for a, b in m2["baseline_mean"].items()})
    print("   with flagged:", {a: round(b, 4) for a, b in m2["sensitivity_with_flagged_rows"].items()})
    print("   coef per unit:", {a: round(b, 4) for a, b in c2.items()})
    print("MODEL 3  FLEX burning rate", f"{m3['rows']} rows")
    print("   model   ", {a: round(b, 4) for a, b in m3["model"].items()}, " baseline", {a: round(b, 4) for a, b in m3["baseline_mean"].items()})
    print("   without droplet diameter:", {a: round(b, 4) for a, b in m3["without_droplet_diameter"].items()})
    print("   with flagged:", {a: round(b, 4) for a, b in m3["sensitivity_with_flagged_rows"].items()})
    print("   coef per unit:", {a: round(b, 4) for a, b in c3.items()})
    print("PHYSICS CHECKS")
    for name, ok in checks:
        print(f"   {'PASS' if ok else 'FAIL'}  {name}")


if __name__ == "__main__":
    main()
