"use client"

import { useMemo, useState } from "react"
import { FlameVisual } from "./FlameVisual"
import { EstimateTag, MeasuredTag, Source } from "./ui"
import {
  flameSurvivesEarth, inRange, spreadRate, stressTest, SHORT_NAME,
  type Habitat, type LinearModel, type MaterialMOC, type PressureEffect, type StressStatus,
} from "@/lib/science"

type Props = {
  habitats: Habitat[]
  materials: MaterialMOC[]
  pressureEffect: PressureEffect
  model1: LinearModel & { valid_ranges: { o2_percent: [number, number]; rod_d_cm: [number, number] } }
  model2: LinearModel & { valid_ranges: Record<"earth" | "micro", { o2_percent: [number, number]; flow_cm_s: [number, number]; rod_d_cm: [number, number] }> }
  issLowestByRod: Record<string, number | null>
  gap: { min: number; max: number }
}

const STATUS_STYLE: Record<StressStatus, { label: string; cls: string; order: number }> = {
  burns: { label: "Burns", cls: "border-hazard/40 bg-hazard/15 text-hazard", order: 0 },
  borderline: { label: "Borderline", cls: "border-warn/40 bg-warn/15 text-warn", order: 1 },
  untested: { label: "Not tested here", cls: "border-line bg-space-700 text-ink-2", order: 2 },
  "self-extinguishes": { label: "Self-extinguishes", cls: "border-safe/30 bg-safe/10 text-safe", order: 3 },
}

const RODS = [0.32, 0.64, 0.95, 1.27]

export function HabitatLab({ habitats, materials, pressureEffect, model1, model2, issLowestByRod, gap }: Props) {
  const usable = habitats.filter((h) => h.o2_percent != null)
  const [preset, setPreset] = useState("exploration")
  const start = usable.find((h) => h.id === preset)!
  const [o2, setO2] = useState(start.o2_percent!)
  const [psia, setPsia] = useState(start.pressure_psia)
  const [flow, setFlow] = useState(5)
  const [rod, setRod] = useState(0.64)
  const [showAll, setShowAll] = useState(false)

  function choose(h: Habitat) {
    setPreset(h.id)
    setO2(h.o2_percent!)
    setPsia(h.pressure_psia)
  }

  const results = useMemo(
    () =>
      materials
        .map((m) => ({ m, r: stressTest(m, o2, psia, pressureEffect) }))
        .sort((a, b) => STATUS_STYLE[a.r.status].order - STATUS_STYLE[b.r.status].order || (b.r.marginPts || -99) - (a.r.marginPts || -99)),
    [materials, o2, psia, pressureEffect],
  )
  const count = (s: StressStatus) => results.filter((x) => x.r.status === s).length
  const estimated = results.some((x) => x.r.estimated)
  const shown = showAll ? results : results.slice(0, 10)

  // Model predictions, only inside the tested ranges
  const m1ok = inRange(o2, model1.valid_ranges.o2_percent) && inRange(rod, model1.valid_ranges.rod_d_cm)
  const pEarth = m1ok ? flameSurvivesEarth(model1, o2, rod) : null
  const issLow = issLowestByRod[`${rod} cm`]
  const vr = model2.valid_ranges
  const m2e = inRange(o2, vr.earth.o2_percent) && inRange(flow, vr.earth.flow_cm_s) && inRange(rod, vr.earth.rod_d_cm)
  const m2m = inRange(o2, vr.micro.o2_percent) && inRange(flow, vr.micro.flow_cm_s) && inRange(rod, vr.micro.rod_d_cm)
  // A linear model can go to zero or below at the edge of its range; show that as "no estimate", never clamp it.
  const rawEarth = m2e ? spreadRate(model2, o2, flow, rod, false) : null
  const rawMicro = m2m ? spreadRate(model2, o2, flow, rod, true) : null
  const vEarth = rawEarth != null && rawEarth > 0 ? rawEarth : null
  const vMicro = rawMicro != null && rawMicro > 0 ? rawMicro : null
  const eva = habitats.find((h) => h.id === "eva")

  return (
    <div className="grid gap-5">
      {/* Controls + flame */}
      <section className="panel grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_minmax(0,420px)]" aria-labelledby="lab-title">
        <div className="min-w-0">
          <div className="label mb-1">Step 1</div>
          <h2 id="lab-title" className="text-lg font-semibold">Choose a cabin atmosphere</h2>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Atmosphere presets">
            {usable.map((h) => (
              <button
                key={h.id}
                type="button"
                aria-pressed={preset === h.id}
                onClick={() => choose(h)}
                className={`rounded-full px-4 py-2 text-sm transition ${preset === h.id ? "glow-ring bg-space-700 text-ink" : "border border-line text-ink-2 hover:text-ink"}`}
              >
                {SHORT_NAME[h.id]} <span className="num text-ink-3">{h.o2_percent}% · {h.pressure_psia} psi</span>
              </button>
            ))}
          </div>
          {eva && (
            <p className="mt-2 text-xs text-ink-3">
              EVA suit ({eva.pressure_psia} psi) is not listed: none of our sources states its O₂ share, so we don&apos;t guess it.
            </p>
          )}

          <div className="mt-6 grid gap-5">
            <Slider id="o2" label="Oxygen" unit="% O₂" min={15} max={40} step={0.5} value={o2} onChange={(v) => { setO2(v); setPreset("custom") }} />
            <Slider id="psia" label="Cabin pressure" unit="psi" min={4} max={14.7} step={0.1} value={psia} onChange={(v) => { setPsia(v); setPreset("custom") }} />
            <Slider id="flow" label="Air flow past the material" unit="cm/s" min={0.5} max={25} step={0.5} value={flow} onChange={setFlow} />
            <div>
              <div className="label mb-2" id="rod-label">PMMA rod diameter (for the model predictions)</div>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="rod-label">
                {RODS.map((d) => (
                  <button key={d} type="button" aria-pressed={rod === d} onClick={() => setRod(d)} className={`num rounded-full px-3 py-1.5 text-sm ${rod === d ? "bg-cyan text-space-950" : "border border-line text-ink-2"}`}>
                    {d} cm
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-3">
            Partial pressure of O₂: <span className="num text-ink-2">{((o2 / 100) * psia).toFixed(2)} psi</span>. Presets from NTRS 20150021491, pp. 4–6.
          </p>
        </div>
        <FlameVisual o2={o2} />
      </section>

      {/* #1 Stress test */}
      <section id="stress-test" className="panel scroll-mt-24 p-5 sm:p-6" aria-labelledby="st-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="label mb-1">Step 2 · Habitat stress test</div>
            <h2 id="st-title" className="text-lg font-semibold">Which spacecraft materials would burn in this air?</h2>
          </div>
          {estimated ? <EstimateTag text="Pressure-adjusted: estimate range" /> : <MeasuredTag />}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["burns", "borderline", "self-extinguishes", "untested"] as StressStatus[]).map((s) => (
            <div key={s} className={`rounded-2xl border px-4 py-3 ${STATUS_STYLE[s].cls}`}>
              <div className="num text-3xl font-semibold">{count(s)}</div>
              <div className="text-xs">{STATUS_STYLE[s].label}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-space-800 text-left">
              <tr>
                <th className="label px-3 py-2.5">Material</th>
                <th className="label px-3 py-2.5">Type</th>
                <th className="label px-3 py-2.5 text-right">Limit at test (10.2 psi)</th>
                <th className="label px-3 py-2.5 text-right">Limit here</th>
                <th className="label px-3 py-2.5 text-right">O₂ margin</th>
                <th className="label px-3 py-2.5">Result</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ m, r }, i) => (
                <tr key={`${m.material}-${i}`} className="border-t border-line">
                  <td className="px-3 py-2.5"><div className="font-medium">{m.material}</div><div className="text-xs text-ink-3">{m.composition}{m.notes ? ` · ${m.notes}` : ""}</div></td>
                  <td className="px-3 py-2.5 text-ink-2">{m.category}</td>
                  <td className="num px-3 py-2.5 text-right">{m.moc_qualifier === "=" ? "" : m.moc_qualifier}{m.moc_percent_o2}%</td>
                  <td className="num px-3 py-2.5 text-right">
                    {r.estimated ? `${r.mocLow.toFixed(1)}–${r.mocHigh.toFixed(1)}%` : `${r.mocHigh.toFixed(1)}%`}
                  </td>
                  <td className={`num px-3 py-2.5 text-right ${r.marginPts > 0 ? "text-hazard" : "text-ink-2"}`}>
                    {Number.isNaN(r.marginPts) ? "–" : `${m.moc_qualifier === "<" ? "≥ " : ""}${r.marginPts > 0 ? "+" : ""}${r.marginPts.toFixed(1)}`}
                  </td>
                  <td className="px-3 py-2.5"><span className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLE[r.status].cls}`}>{STATUS_STYLE[r.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {results.length > 10 && (
          <button type="button" onClick={() => setShowAll(!showAll)} className="mt-3 text-sm text-cyan hover:underline">
            {showAll ? "Show fewer" : `Show all ${results.length} materials`}
          </button>
        )}

        <div className="mt-5 grid gap-3 rounded-2xl border border-line bg-space-900/60 p-4 text-sm leading-relaxed text-ink-2 md:grid-cols-2">
          <div>
            <div className="label mb-2">How the result is decided</div>
            <p><b className="text-ink">Limit (MOC)</b> = the highest O₂ % at which the material still puts itself out in NASA&apos;s Earth fire test (NASA-STD-6001 Test 1), measured at 10.2 psi.</p>
            <p className="mt-2 num text-xs text-ink">O₂ margin = cabin O₂ − limit. Above the limit → burns.</p>
            <p className="mt-2">At other pressures the limit shifts by <span className="num">0.25–0.98</span> points per psi (lower pressure → higher limit), so we show a range and call it an estimate.</p>
          </div>
          <div>
            <div className="label mb-2">Why space can be worse</div>
            <p>This test runs in Earth gravity. On the ISS, PMMA rods burned <span className="num text-ink">{gap.min.toFixed(1)}–{gap.max.toFixed(1)}</span> points of O₂ below where our Earth model expects a 50% chance of burning. That gap is measured for PMMA rods only; other materials are untested in microgravity.</p>
          </div>
        </div>
        <Source>
          NTRS 20070018178 (Hirsch et al.), Tables 1–2: 26 materials at 10.2 psi · pressure slope: NTRS 20110008636, Eq. 1 · microgravity gap: Link et al. 2018 Table S1 vs our Model 1.
        </Source>
      </section>

      {/* Model predictions */}
      <section className="panel p-5 sm:p-6" aria-labelledby="pred-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="label mb-1">Step 3 · AI prediction</div>
            <h2 id="pred-title" className="text-lg font-semibold">PMMA rod at {o2.toFixed(1)}% O₂, {flow} cm/s, {rod} cm</h2>
          </div>
          <EstimateTag />
        </div>
        {!m1ok && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-space-900/60 px-4 py-3 text-sm text-ink-2">
            The rod models were trained on {model1.valid_ranges.o2_percent.join("–")}% O₂, so they stay silent at {o2.toFixed(1)}%.
            <button type="button" onClick={() => { setO2(18.5); setPsia(14.7); setFlow(2); setPreset("custom") }} className="rounded-full border border-cyan/40 px-3 py-1.5 text-xs text-cyan hover:bg-cyan/10">
              Try 18.5% O₂, 14.7 psi, 2 cm/s
            </button>
          </div>
        )}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <PredictionCard
            title="Chance the flame keeps spreading (Earth)"
            value={pEarth == null ? null : `${Math.round(pEarth * 100)}%`}
            note={pEarth == null ? `No test data: trained on ${model1.valid_ranges.o2_percent.join("–")}% O₂` : "Model 1, logistic regression · caught every flame-out in testing"}
          />
          <PredictionCard
            title="Spread rate, Earth gravity"
            value={vEarth == null ? null : `${vEarth.toFixed(3)} mm/s`}
            note={vEarth == null ? rawEarth != null ? "The model gives no positive rate here (edge of its range), so no estimate is shown" : `No test data for these settings (Earth tests: ${vr.earth.flow_cm_s.join("–")} cm/s, ${vr.earth.o2_percent.join("–")}% O₂)` : "Model 2, ridge regression · R² 0.53"}
          />
          <PredictionCard
            title="Spread rate, microgravity"
            value={vMicro == null ? null : `${vMicro.toFixed(3)} mm/s`}
            note={vMicro == null ? rawMicro != null ? "The model gives no positive rate here (edge of its range), so no estimate is shown" : `No test data for these settings (ISS tests: ${vr.micro.flow_cm_s.join("–")} cm/s, ${vr.micro.o2_percent.join("–")}% O₂, rods ${vr.micro.rod_d_cm.join("–")} cm)` : "Model 2, ridge regression · R² 0.53"}
          />
        </div>
        <div className="mt-4 rounded-2xl border border-cyan/25 bg-cyan/5 p-4 text-sm leading-relaxed text-ink-2">
          <span className="font-semibold text-cyan">Measured on the ISS: </span>
          {issLow != null
            ? `a ${rod} cm rod kept burning down to ${issLow}% O₂. There is no microgravity survival model because every ISS rod test kept burning, so there is no flame-out boundary to learn from.`
            : `no ISS test used a ${rod} cm rod.`}
        </div>
        <Source>Models trained on Link et al. 2018 Tables S1–S2 (CC BY 4.0). Scores, tests and limits: For Scientists page and models/MODEL_CARD.md.</Source>
      </section>
    </div>
  )
}

function Slider({ id, label, unit, min, max, step, value, onChange }: { id: string; label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">{label}</label>
        <span className="num text-sm">{value.toFixed(step < 1 ? 1 : 0)} {unit}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
    </div>
  )
}

function PredictionCard({ title, value, note }: { title: string; value: string | null; note: string }) {
  return (
    <div className="rounded-2xl border border-line bg-space-900/60 p-4">
      <div className="text-sm text-ink-2">{title}</div>
      <div className={`num mt-2 text-3xl font-semibold ${value ? "text-ink" : "text-ink-3"}`}>{value ?? "—"}</div>
      <p className="mt-2 text-xs leading-relaxed text-ink-3">{note}</p>
    </div>
  )
}
