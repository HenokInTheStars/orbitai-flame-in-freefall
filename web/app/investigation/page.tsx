import { Droplets, Moon, Wind } from "lucide-react"
import { HabitatLab } from "@/components/HabitatLab"
import { OxygenSoak } from "@/components/OxygenSoak"
import { EstimateTag, MeasuredTag, PageTitle, Panel, Source } from "@/components/ui"
import { habitats, materials, metrics, model1, model2, partialGravity, pressureEffect, records, soak } from "@/lib/data"
import { microgravityGap } from "@/lib/science"

export const metadata = { title: "Investigation · Flame in Freefall" }

export default function InvestigationPage() {
  const lines = model1.earth_50pct_line_vs_iss_measured
  const issLowestByRod = Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, v.iss_lowest_o2_with_flame_spread_measured]))
  const gap = microgravityGap(lines)

  // FLEX: how tests ended, by what was mixed into the air (measured)
  const flex = records.filter((r) => r.psi_id === "PSI-69")
  const diluent = (r: (typeof flex)[number]) => {
    const e = r.extra as { co2_mole_fraction: number | null; he_mole_fraction: number | null }
    return (e.co2_mole_fraction ?? 0) > 0 ? "CO₂ added" : (e.he_mole_fraction ?? 0) > 0 ? "Helium added" : "Nitrogen only"
  }
  const groups = ["Nitrogen only", "CO₂ added", "Helium added"].map((g) => {
    const rows = flex.filter((r) => diluent(r) === g)
    return { g, n: rows.length, ext: rows.filter((r) => r.outcome === "Extinction").length }
  })
  const c3 = metrics.model3_flex_burning.coef_per_unit

  const luci = partialGravity.filter((r) => r.kind === "measured" && r.value_1g != null)
  const fm2 = partialGravity.filter((r) => r.kind === "planned")

  return (
    <>
      <PageTitle
        kicker="Investigation"
        title="Predict, warn, extinguish"
        lede="Pick a cabin atmosphere and see which spacecraft materials would burn, what our models predict, how long oxygen lingers after a spacewalk, and what puts a fire out in microgravity. Every result says whether it is measured or a model estimate."
      />
      <div className="grid gap-5">
        <HabitatLab
          habitats={habitats}
          materials={materials}
          pressureEffect={pressureEffect}
          model1={model1 as never}
          model2={model2 as never}
          issLowestByRod={issLowestByRod}
          gap={gap}
        />

        <OxygenSoak rows={soak} />

        {/* Extinguishing */}
        <section id="extinguish" className="scroll-mt-24 grid gap-5 lg:grid-cols-2" aria-label="Extinguishing">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="label mb-1">Extinguishing · FLEX droplet tests on the ISS</div>
                <h2 className="text-lg font-semibold">What happens when you change the air?</h2>
              </div>
              <MeasuredTag />
            </div>
            <ul className="mt-4 grid gap-3">
              {groups.map((x) => (
                <li key={x.g}>
                  <div className="flex justify-between text-sm"><span className="text-ink-2"><Wind size={13} className="mr-1.5 inline" />{x.g}</span><span className="num">{x.ext} of {x.n} ended in extinction</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-space-700"><div className="h-1.5 rounded-full bg-cyan" style={{ width: `${(x.ext / x.n) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-2xl border border-line bg-space-900/60 p-4 text-sm leading-relaxed text-ink-2">
              <div className="mb-2 flex flex-wrap items-center gap-2"><span className="font-semibold text-ink">Model 3 trends</span><EstimateTag text="Associations, not cause and effect" /></div>
              Holding the rest equal, each +1 point of O₂ raises the burning rate by <span className="num text-ink">{c3.o2_percent.toFixed(3)}</span>; replacing nitrogen with CO₂ lowers it
              (<span className="num text-ink">{c3.co2_fraction.toFixed(3)}</span> per unit mole fraction) while helium raises it (<span className="num text-ink">+{c3.he_fraction.toFixed(3)}</span>). Burning rate is in
              PSI-69&apos;s reported unit (probably mm²/s, not yet verified). Model R² 0.71 on unseen tests.
            </div>
            <Source>NASA PSI-69 FLEX experimental table, doi:10.60555/mbq8-0451 (274 tests). Model: models/MODEL_CARD.md.</Source>
          </Panel>

          <Panel>
            <div className="label mb-1">Extinguishing · water mist</div>
            <h2 className="text-lg font-semibold">Why the ISS is moving to fine water mist</h2>
            <div className="mt-4 grid gap-4 text-sm leading-relaxed text-ink-2">
              <p><Droplets size={14} className="mr-1.5 inline text-cyan" />The US side of the ISS uses a carbon-dioxide extinguisher. A CO₂ discharge means the crew needs its own oxygen supply, which &ldquo;inherently&rdquo; creates an unsafe environment. A fine-water-mist extinguisher puts the fire out without making the air unbreathable.</p>
              <p><Droplets size={14} className="mr-1.5 inline text-cyan" />On Space Shuttle mission STS-107 (2003), 32 microgravity tests sent propane-air flames through water mist. Preliminary results: the leanest flames slowed with more water and with smaller droplets (20 vs 30 µm), and went out at the highest water loadings.</p>
              <p className="text-xs text-ink-3">The same physics matters on Earth: mist uses little water and leaves no toxic residue. See the Earth applications on the Explorers page.</p>
            </div>
            <Source>NTRS 20120018019 (ISS fine water mist portable extinguisher, abstract) · NTRS 20040053582, pp. 281–283 (Mist experiment, STS-107).</Source>
          </Panel>
        </section>

        {/* Known unknowns */}
        <section id="unknowns" className="panel scroll-mt-24 p-5 sm:p-6" aria-labelledby="unk-title">
          <div className="label mb-1">Known unknowns</div>
          <h2 id="unk-title" className="text-lg font-semibold"><Moon size={16} className="mr-2 inline text-warn" />No fire has ever been tested on the Moon</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
            We make no Moon or Mars predictions. Here is everything our sources measured at Lunar gravity, all in simulators: a spinning rocket, aircraft
            parabolas and a drop-tower centrifuge. NASA researchers conclude that &ldquo;Lunar gravity is nearly the most flammable condition&rdquo;.
          </p>

          <GravityAxis />

          <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-space-800 text-left">
                <tr>
                  <th className="label px-3 py-2.5">Sample</th>
                  <th className="label px-3 py-2.5">Quantity</th>
                  <th className="label px-3 py-2.5 text-right">Lunar g</th>
                  <th className="label px-3 py-2.5 text-right">Earth (1 g)</th>
                  <th className="label px-3 py-2.5 text-right">Ratio</th>
                </tr>
              </thead>
              <tbody>
                {luci.map((r) => (
                  <tr key={r.obs_id} className="border-t border-line">
                    <td className="px-3 py-2.5"><div>{r.material}</div><div className="text-xs text-ink-3">{r.spread_direction} · {r.platform}</div></td>
                    <td className="px-3 py-2.5 text-ink-2">{r.quantity}</td>
                    <td className="num px-3 py-2.5 text-right">{r.value} {r.unit}</td>
                    <td className="num px-3 py-2.5 text-right">{r.value_1g} {r.unit}</td>
                    <td className="num px-3 py-2.5 text-right">{r.ratio_partial_to_1g}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            In these short tests the flames spread <b className="text-ink">slower</b> at Lunar gravity, but the fabric flame lasted about 45 s longer before going out. Slower is not safer:
            the question is whether a flame survives, and that is exactly what has not been measured on the Moon.
          </p>
          <div className="mt-4 rounded-2xl border border-warn/30 bg-warn/5 p-4 text-sm text-ink-2">
            <span className="font-semibold text-warn">Planned, not flown: </span>
            NASA&apos;s FM2 experiment will burn fabric samples on the Lunar surface at 8.2 psi in{" "}
            <span className="num text-ink">{fm2.map((r) => `${r.value}%`).join(", ")}</span> O₂ — the first fire experiment on another world.
          </div>
          <Source>NTRS 20250010653 (LUCI, pp. 33–36) · NTRS 20260001966 (LPSC 2026 slides, pp. 10, 18, 22) · NTRS 20260000646 (FM2 abstract). Full table: data/raw/ntrs/partial_gravity_observations.csv.</Source>
        </section>

      </div>
    </>
  )
}

function GravityAxis() {
  const stops = [
    { g: "0 g", label: "Microgravity", detail: "ISS & Cygnus: hundreds of tests", cls: "bg-cyan", status: "Well studied" },
    { g: "0.165 g", label: "Moon", detail: "6 values, simulators only", cls: "bg-hazard", status: "Barely tested" },
    { g: "0.38 g", label: "Mars", detail: "1 aircraft study (figure only)", cls: "bg-hazard", status: "Barely tested" },
    { g: "1 g", label: "Earth", detail: "All material certification", cls: "bg-earth", status: "Well studied" },
  ]
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-4" role="list" aria-label="Data coverage by gravity level">
      {stops.map((s) => (
        <div key={s.g} role="listitem" className="rounded-2xl border border-line bg-space-900/60 p-4">
          <div className={`mb-3 h-1.5 rounded-full ${s.cls}`} />
          <div className="num text-xs text-ink-3">{s.g}</div>
          <div className="font-semibold">{s.label}</div>
          <div className="mt-1 text-xs text-ink-2">{s.detail}</div>
          <div className={`mt-2 text-xs font-medium ${s.status === "Well studied" ? "text-safe" : "text-hazard"}`}>{s.status}</div>
        </div>
      ))}
    </div>
  )
}
