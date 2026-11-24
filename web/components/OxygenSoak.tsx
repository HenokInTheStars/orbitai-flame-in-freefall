"use client"

import { useState } from "react"
import { Source } from "./ui"
import { formatDuration, type SoakRow } from "@/lib/science"

/**
 * #4 Post-EVA oxygen-soak timer. After 100% O2 exposure (e.g. spacesuit prep), materials hold extra oxygen.
 * Bars = measured time until the material's oxygen falls back to its flammability limit (MOC), on a log scale,
 * compared with the 30-minute rule of thumb. All values from NTRS 20100019472.
 */
export function OxygenSoak({ rows }: { rows: SoakRow[] }) {
  const scenarios = Array.from(new Set(rows.map((r) => r.scenario)))
  const [scenario, setScenario] = useState(scenarios[0])
  const data = rows.filter((r) => r.scenario === scenario).sort((a, b) => b.time_to_moc_minutes - a.time_to_moc_minutes)

  // log10 scale from 0.1 min to the largest value
  const maxMin = Math.max(...rows.map((r) => r.time_to_moc_minutes))
  const lo = Math.log10(0.1)
  const hi = Math.log10(maxMin * 1.5)
  const pct = (m: number) => ((Math.log10(Math.max(m, 0.1)) - lo) / (hi - lo)) * 100
  const ruleX = pct(30)
  const over = data.filter((r) => r.exceeds_30_min_rule === "yes").length

  return (
    <section id="oxygen-soak" className="panel scroll-mt-24 p-5 sm:p-6" aria-labelledby="soak-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label mb-1">Oxygen-soak timer</div>
          <h2 id="soak-title" className="text-lg font-semibold">After 100% oxygen, how long do materials stay extra-flammable?</h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-[11px] font-medium text-cyan">
          NASA calculation (diffusion model)
        </span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
        Before a spacewalk, crews and their gear sit in pure oxygen, and materials soak it up. The accepted rule of thumb gives them 30 minutes
        to return to normal; NASA&apos;s report says that rule &ldquo;was not based on data&rdquo;. Its calculations show the rule can be far too short for
        closed-cell foams, and may be &ldquo;overly conservative&rdquo; for porous materials.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Test scenario">
        {scenarios.map((s) => (
          <button key={s} type="button" aria-pressed={s === scenario} onClick={() => setScenario(s)} className={`rounded-full px-4 py-2 text-sm ${s === scenario ? "glow-ring bg-space-700" : "border border-line text-ink-2"}`}>
            {s}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm"><span className="num text-2xl font-semibold text-hazard">{over} of {data.length}</span> <span className="text-ink-2">materials stay above their limit longer than 30 minutes.</span></p>

      <div className="relative mt-4 grid gap-2.5">
        <div className="pointer-events-none absolute inset-y-0 border-l border-dashed border-warn/70" style={{ left: `calc(min(42%, 220px) + (100% - min(42%, 220px)) * ${ruleX / 100})` }} aria-hidden />
        {data.map((r) => (
          <div key={r.material} className="grid grid-cols-[min(42%,220px)_1fr] items-center gap-3 text-sm">
            <div className="min-w-0">
              <div className="truncate" title={r.material}>{r.material}</div>
              <div className="text-xs text-ink-3">{r.porosity} · limit {r.moc_percent_o2}% O₂</div>
            </div>
            <div className="relative h-7">
              <div className={`h-7 rounded-r-lg ${r.exceeds_30_min_rule === "yes" ? "bg-hazard/70" : "bg-safe/60"}`} style={{ width: `${Math.max(1.5, pct(r.time_to_moc_minutes))}%` }} />
              <span className="num absolute inset-y-0 right-1 flex items-center text-xs text-ink">{formatDuration(r.time_to_moc_minutes)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-[min(42%,220px)_1fr] gap-3 text-[11px] text-ink-3">
        <span />
        <span>Log scale · dashed line = 30-minute rule</span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-2">
        One example from the report: the closed-cell foam in the astronaut cooling garment (Mosite) needs about 447 hours for oxygen trapped in a
        1 cm gap behind it to diffuse away, and that garment is worn next to the skin.
      </p>
      <Source>NTRS 20100019472 (Harper, Smith, Juarez, Hirsch): calculated time for each material to fall back to its MOC after 100% O₂ exposure (&ldquo;theoretical approximations&rdquo;, not burn tests). &ldquo;Entrapment&rdquo; = oxygen trapped in a 1 cm gap; &ldquo;saturation&rdquo; = a 0.5 in cube soaked through.</Source>
    </section>
  )
}
