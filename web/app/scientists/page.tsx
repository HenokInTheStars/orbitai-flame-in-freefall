import { Download } from "lucide-react"
import { Scatter, type Pt } from "@/components/Scatter"
import { EstimateTag, MeasuredTag, PageTitle, Panel, PanelHead, Source } from "@/components/ui"
import { bass, investigations, metrics, model1, rods, saffire2 } from "@/lib/data"

export const metadata = { title: "For Scientists · Flame in Freefall" }

const OUTCOME_LABEL: Record<string, string> = {
  burned: "Burned", burning_no_blowoff: "Burned (no blow-off)", quenched: "Quenched", blowoff: "Blow-off", no_ignition: "No ignition",
}

export default function ScientistsPage() {
  // 1. PMMA rods: spread rate vs O2, ISS vs Earth (Link et al. 2018)
  const rodPts: Pt[] = rods
    .filter((r) => r.flame_spread === "yes" && r.spread_rate_mm_s != null)
    .map((r) => ({
      x: r.o2_percent, y: r.spread_rate_mm_s!, series: r.gravity,
      tip: `${r.gravity === "micro" ? "ISS" : "Earth"} · ${r.d_cm} cm rod · ${r.o2_percent}% O₂ · ${r.flow_cm_s} cm/s → ${r.spread_rate_mm_s!.toFixed(4)} mm/s${r.sample_as_printed ? ` (sample ${r.sample_as_printed})` : ""} · Link et al. 2018 Table ${r.table}`,
    }))
  const earthNo = rods.filter((r) => r.gravity === "earth" && r.flame_spread === "no").length

  // 2. BASS / BASS-II SIBAL map: flow vs O2, outcome (NTRS 20150008962)
  const bassPts: Pt[] = bass.map((r) => ({
    x: r.flow_end_cm_s, y: r.o2_percent, series: r.outcome,
    tip: `${r.investigation} ${r.test_id} · ${r.sample_width_cm} cm SIBAL · ${r.o2_percent}% O₂ · flow ${r.flow_start_cm_s}→${r.flow_end_cm_s} cm/s · ${OUTCOME_LABEL[r.outcome] ?? r.outcome}${r.notes ? ` · note: ${r.notes}` : ""}`,
  }))

  // 3. Saffire-II: same sample, microgravity vs Earth
  const ids = Array.from(new Set(saffire2.map((r) => r.test_id)))
  const pairs = ids.map((id) => ({ micro: saffire2.find((r) => r.test_id === id && r.gravity === "micro")!, earth: saffire2.find((r) => r.test_id === id && r.gravity === "earth")! }))

  const lines = model1.earth_50pct_line_vs_iss_measured
  const m = metrics

  return (
    <>
      <PageTitle
        kicker="For Scientists"
        title="The evidence, test by test"
        lede="Every point below is a measured test with its source in the tooltip. Model outputs are marked as estimates, scored only on tests they never saw, and published with their limits."
      />
      <div className="grid gap-5">
        <Panel id="earth-vs-space">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PanelHead kicker="Earth vs Space · PMMA rods" title="Flame spread rate vs oxygen, ISS and Earth" />
            <MeasuredTag />
          </div>
          <Scatter
            points={rodPts}
            series={[{ id: "micro", label: "ISS microgravity (BASS-II)", color: "#67e2f0" }, { id: "earth", label: "Earth gravity", color: "#f5a524" }]}
            xLabel="Oxygen (% by volume)" yLabel="Spread rate (mm/s)" xDomain={[16.5, 21.2]} yDomain={[0, 0.25]} width={1100} height={380}
            ariaLabel="Scatter of flame spread rate against oxygen for PMMA rods on the ISS and on Earth"
          />
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            On the ISS, rods kept spreading down to 16.8% O₂. On Earth, {earthNo} conditions showed no steady spread at all (not plotted, since they have no rate).
            Below about 19% O₂ the microgravity flames spread faster than Earth flames, the crossover the paper reports on p. 6.
          </p>
          <Source>Link, Huang, Fernandez-Pello, Olson &amp; Ferkul (2018), Sci Rep 8:120, Tables S1–S2, doi:10.1038/s41598-017-18398-4 (CC BY 4.0). Microgravity O₂ uncertainty ±0.3%.</Source>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <PanelHead kicker="Flammability map · BASS / BASS-II" title="When does a fabric flame survive in microgravity?" />
              <MeasuredTag />
            </div>
            <Scatter
              points={bassPts}
              series={[
                { id: "burned", label: "Burned", color: "#f87171" },
                { id: "burning_no_blowoff", label: "Burned (no blow-off)", color: "#fb923c" },
                { id: "quenched", label: "Quenched", color: "#67e2f0" },
                { id: "blowoff", label: "Blow-off", color: "#c084fc" },
                { id: "no_ignition", label: "No ignition", color: "#94a3b8", hollow: true },
              ]}
              xLabel="Air flow at end of test (cm/s, log scale)" yLabel="Oxygen (%)" xLog xDomain={[1.5, 60]} yDomain={[16, 21.5]} height={300}
              ariaLabel="Flammability map of SIBAL fabric: flow against oxygen, coloured by outcome"
            />
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Flames quenched at very low flows of 1–5 cm/s, at higher speeds when O₂ was lower. No ignition at 16.8% and 16.4% O₂. GMT178-T17 (53 cm/s) was checked against the PDF.
            </p>
            <Source>Zhao, T&apos;ien, Ferkul &amp; Olson (2015), NTRS 20150008962, Appendix (31 tests). Cross-checked with PSI-25 BASS-II.</Source>
          </Panel>

          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <PanelHead kicker="Saffire-II · same sample, two gravities" title="Is microgravity always worse? No." />
              <MeasuredTag />
            </div>
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="bg-space-800 text-left">
                  <tr>
                    <th className="label px-3 py-2">Sample</th>
                    <th className="label px-3 py-2">Microgravity</th>
                    <th className="label px-3 py-2">Earth (1 g)</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map(({ micro, earth }) => (
                    <tr key={micro.test_id} className="border-t border-line align-top">
                      <td className="px-3 py-2"><div className="font-medium">{micro.test_id} {micro.material_or_fuel ?? <span className="text-ink-3">(not named)</span>}</div><div className="text-xs text-ink-3">{micro.thickness_mm != null ? `${micro.thickness_mm} mm` : ""} {micro.flow_direction}</div></td>
                      <td className="px-3 py-2 text-ink-2">{describe(micro)}</td>
                      <td className="px-3 py-2 text-ink-2">{describe(earth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">Thin silicone barely burned in microgravity but burned completely on Earth. Both directions are real, and the dashboard shows both.</p>
            <Source>NASA PSI-99 Saffire-II experimental table, doi:{investigations["PSI-99"].doi} (CC0). Flown on Cygnus after it left the ISS.</Source>
          </Panel>
        </div>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PanelHead kicker="Models" title="How we predict, and how well" />
            <EstimateTag text="All predictions are estimates" />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-space-800 text-left">
                <tr>
                  <th className="label px-3 py-2.5">Model</th><th className="label px-3 py-2.5">Data</th><th className="label px-3 py-2.5">Tested by</th>
                  <th className="label px-3 py-2.5 text-right">Score</th><th className="label px-3 py-2.5 text-right">Baseline</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line align-top">
                  <td className="px-3 py-2.5"><b>1 · Flame survives (Earth)</b><div className="text-xs text-ink-3">logistic regression: O₂, 1/diameter</div></td>
                  <td className="px-3 py-2.5 text-ink-2">{m.model1_flame_survives.rows} Earth conditions, 4 rod sizes</td>
                  <td className="px-3 py-2.5 text-ink-2">leave one rod size out (4 rounds)</td>
                  <td className="num px-3 py-2.5 text-right">AUC {m.model1_flame_survives.model.auc.toFixed(2)} · bal. acc {m.model1_flame_survives.model.balanced_accuracy.toFixed(2)}</td>
                  <td className="num px-3 py-2.5 text-right">0.50</td>
                </tr>
                <tr className="border-t border-line align-top">
                  <td className="px-3 py-2.5"><b>2 · Spread rate</b><div className="text-xs text-ink-3">ridge: O₂, log flow, 1/d, gravity</div></td>
                  <td className="px-3 py-2.5 text-ink-2">{m.model2_spread_rate.rows} rows, ISS + Earth</td>
                  <td className="px-3 py-2.5 text-ink-2">5-fold, grouped by test</td>
                  <td className="num px-3 py-2.5 text-right">R² {m.model2_spread_rate.model.r2.toFixed(2)} · MAE {m.model2_spread_rate.model.mae_mm_s.toFixed(3)} mm/s</td>
                  <td className="num px-3 py-2.5 text-right">R² {m.model2_spread_rate.baseline_mean.r2.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-line align-top">
                  <td className="px-3 py-2.5"><b>3 · FLEX burning rate</b><div className="text-xs text-ink-3">ridge: O₂, pressure, CO₂, He, fuel, droplet size</div></td>
                  <td className="px-3 py-2.5 text-ink-2">{m.model3_flex_burning.rows} ISS droplet tests</td>
                  <td className="px-3 py-2.5 text-ink-2">5-fold, grouped by test</td>
                  <td className="num px-3 py-2.5 text-right">R² {m.model3_flex_burning.model.r2.toFixed(2)} · MAE {m.model3_flex_burning.model.mae.toFixed(3)}</td>
                  <td className="num px-3 py-2.5 text-right">R² {Math.abs(m.model3_flex_burning.baseline_mean.r2) < 0.005 ? "0.00" : m.model3_flex_burning.baseline_mean.r2.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <div className="label mb-2">Model 1 · each test round</div>
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-space-800 text-left"><tr><th className="label px-3 py-2">Rod held out</th><th className="label px-3 py-2 text-right">Accuracy</th><th className="label px-3 py-2 text-right">Flame-outs caught</th><th className="label px-3 py-2 text-right">False alarms</th></tr></thead>
                  <tbody>
                    {Object.entries(m.model1_flame_survives.per_round).map(([k, v]) => (
                      <tr key={k} className="border-t border-line"><td className="px-3 py-2">{k.replace(" held out", "")}</td><td className="num px-3 py-2 text-right">{v.accuracy.toFixed(2)}</td><td className="num px-3 py-2 text-right text-safe">{v.flame_outs_caught} / {v.flame_outs}</td><td className="num px-3 py-2 text-right">{v.false_alarms}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="label mb-2">Earth model 50% line vs ISS measurement</div>
              <ul className="grid gap-3">
                {Object.entries(lines).map(([k, v]) => {
                  const lo = 16.5, hi = 19
                  const pos = (o: number) => `${((o - lo) / (hi - lo)) * 100}%`
                  return (
                    <li key={k} className="grid grid-cols-[64px_1fr] items-center gap-3 text-sm">
                      <span className="num text-ink-2">{k}</span>
                      <div className="relative h-6 rounded-full bg-space-800">
                        {v.iss_lowest_o2_with_flame_spread_measured != null && (
                          <>
                            <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink-3" style={{ left: pos(v.iss_lowest_o2_with_flame_spread_measured), width: `calc(${pos(v.earth_model_o2_at_50pct!)} - ${pos(v.iss_lowest_o2_with_flame_spread_measured)})` }} />
                            <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan" style={{ left: pos(v.iss_lowest_o2_with_flame_spread_measured) }} title={`ISS: burning at ${v.iss_lowest_o2_with_flame_spread_measured}% (measured)`} />
                          </>
                        )}
                        <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-earth" style={{ left: pos(v.earth_model_o2_at_50pct!) }} title={`Earth model 50% line: ${v.earth_model_o2_at_50pct}% (estimate)`} />
                        {v.iss_lowest_o2_with_flame_spread_measured == null && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-3">no ISS test at this size</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-xs text-ink-3"><span className="text-cyan">●</span> ISS lowest O₂ still spreading (measured) · <span className="text-earth">●</span> Earth model 50% line (estimate) · axis 16.5–19% O₂</p>
            </div>
          </div>
          <Source>Scores from models/metrics.json, reproduced by scripts/train_models.py. Full details, rejected variants and limits: models/MODEL_CARD.md.</Source>
        </Panel>

        <Panel>
          <PanelHead kicker="Open data" title="Download what the dashboard uses" />
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["records.json", "425 cleaned PSI test records (unified schema)"],
              ["pmma_rods.json", "98 flame-spread rows, ISS + Earth (Link 2018)"],
              ["bass_boundary.json", "31 BASS SIBAL flammability tests"],
              ["materials_moc.json", "26 spacecraft materials, Earth-test O₂ limits"],
              ["oxygen_soak.json", "12 oxygen-soak calculations"],
              ["partial_gravity.json", "Lunar-gravity values + FM2 plan"],
              ["metrics.json", "All model scores"],
              ["investigations.json", "PSI investigations with DOIs"],
            ].map(([f, d]) => (
              <li key={f}>
                <a href={`/data/${f}`} className="flex items-start gap-3 rounded-xl border border-line px-3 py-2.5 text-sm hover:border-cyan/40">
                  <Download size={15} className="mt-0.5 shrink-0 text-cyan" />
                  <span><span className="num text-ink">{f}</span><br /><span className="text-xs text-ink-3">{d}</span></span>
                </a>
              </li>
            ))}
          </ul>
          <Source>Cleaning rules and every known source issue are in the GitHub README. Raw PSI files are never edited.</Source>
        </Panel>
      </div>
    </>
  )
}

function describe(r: (typeof saffire2)[number]) {
  const bits: string[] = []
  if (r.outcome) bits.push(r.outcome)
  if (r.burn_length_cm != null) bits.push(`burn length ${r.burn_length_cm} cm`)
  if (r.spread_rate_mm_s != null) bits.push(`${r.spread_rate_mm_s} mm/s`)
  if (!bits.length) bits.push(r.ignited === true ? "ignited" : r.ignited === false ? "did not ignite" : "not reported")
  return bits.join(" · ")
}
