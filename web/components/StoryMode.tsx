"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { FlameVisual } from "./FlameVisual"

export type StoryFacts = {
  issLowestO2: number
  rodSizeCm: number
  earthLineSameRod: number
  burns34: number
  borderline34: number
  materials: number
  fm2O2: number[]
}

/** #3 Story mode: five steps from "Earth-safe" to "what we do next". Doubles as the demo-video script.
 *  Every number is passed in from the data (see app/explorers/page.tsx), none is typed here. */
export function StoryMode({ f }: { f: StoryFacts }) {
  const steps = [
    {
      kicker: "1 · How NASA checks a material",
      title: "Light it at the bottom. Does the flame climb?",
      body: "Before anything flies, NASA sets a strip of the material upright, lights the bottom and watches whether the flame climbs it. Pass, and the material is treated as safe for spaceflight. This test runs here on Earth, in Earth gravity.",
      visual: <FlameVisual o2={21} compact />,
      source: "NASA-STD-6001B, Test 1 (Upward Flame Propagation); NTRS 20260000646.",
    },
    {
      kicker: "2 · What the space station showed",
      title: `Flames kept burning at ${f.issLowestO2}% oxygen`,
      body: `Normal air is about 21% oxygen. On the ISS, a ${f.rodSizeCm} cm acrylic rod kept burning at just ${f.issLowestO2}%. Our model of the same rods on Earth puts a 50/50 chance of burning at ${f.earthLineSameRod}%. Without gravity there is no rising hot air, so the flame turns rounder, dimmer and bluer, and it can survive where an Earth flame would struggle.`,
      visual: <BigNumber value={`${f.issLowestO2}%`} label="O₂, still burning on the ISS (measured)" sub={`Earth model 50% line: ${f.earthLineSameRod}% (estimate)`} />,
      source: "Link et al. 2018, Scientific Reports 8:120 (Tables S1–S2, p. 4).",
    },
    {
      kicker: "3 · The habitat problem",
      title: "Moon bases will breathe richer air",
      body: `To make spacewalks easier, NASA's planned 'exploration atmosphere' uses lower pressure and more oxygen: 34% instead of 21%. We checked ${f.materials} spacecraft materials that NASA tested: in that air, ${f.burns34} would burn even in the Earth test, and ${f.borderline34} more are borderline.`,
      visual: <BigNumber value={`${f.burns34} / ${f.materials}`} label="tested materials that burn at 34% O₂, 8.2 psi" sub={`+${f.borderline34} borderline · pressure-adjusted estimate`} tone="hazard" />,
      source: "NTRS 20150021491 (atmosphere); NTRS 20070018178 + 20110008636 (material limits).",
    },
    {
      kicker: "4 · The unknown",
      title: "Nobody has ever tested a fire on the Moon",
      body: "On the Moon, gravity is about one sixth of Earth's. NASA researchers think that may be close to the worst case for fire, because there is just enough rising air to feed a flame but not enough to blow it out. Only simulators have tested it so far, for seconds to minutes. We refuse to guess, so our dashboard marks it as unknown.",
      visual: <BigNumber value="0" label="fire tests ever run on the Moon" sub={`FM2 plans 4 burns at ${f.fm2O2.join(", ")}% O₂`} tone="warn" />,
      source: "NTRS 20260001966 (p. 18); NTRS 20260000646 (FM2 abstract).",
    },
    {
      kicker: "5 · What we can do",
      title: "Test smarter, choose better, plan for the unknown",
      body: "Use microgravity data alongside Earth tests. Pick materials with a wide oxygen margin for richer habitat air. Give spacesuit foams time to release trapped oxygen. The same research also feeds back to Earth: water-mist fire suppression and better smoke-detector design.",
      visual: (
        <div className="grid gap-2 text-sm">
          <Link href="/investigation#stress-test" className="rounded-xl border border-line px-4 py-3 hover:border-cyan/40">Stress-test a habitat →</Link>
          <Link href="/investigation#oxygen-soak" className="rounded-xl border border-line px-4 py-3 hover:border-cyan/40">See the oxygen-soak timer →</Link>
          <Link href="#earth" className="rounded-xl border border-line px-4 py-3 hover:border-cyan/40">How this helps on Earth →</Link>
        </div>
      ),
      source: "NTRS 20100019472 (oxygen soak); NTRS 20120018019 (water mist).",
    },
  ]
  const [i, setI] = useState(0)
  const s = steps[i]

  return (
    <section id="story" className="panel scroll-mt-24 p-5 sm:p-8" aria-roledescription="carousel" aria-label="Two-minute story">
      <div className="mb-5 flex gap-1.5" role="tablist" aria-label="Story steps">
        {steps.map((st, k) => (
          <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={st.kicker} onClick={() => setI(k)} className={`h-1.5 flex-1 rounded-full transition ${k <= i ? "bg-cyan" : "bg-space-700"}`} />
        ))}
      </div>
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,380px)]">
        <div className="min-w-0" aria-live="polite">
          <div className="label text-cyan">{s.kicker}</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-wide sm:text-3xl">{s.title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2">{s.body}</p>
          <p className="mt-4 text-[11px] text-ink-3">Source: {s.source}</p>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-ink-2 disabled:opacity-40">
              <ArrowLeft size={15} /> Back
            </button>
            <button type="button" onClick={() => setI(Math.min(steps.length - 1, i + 1))} disabled={i === steps.length - 1} className="glow-ring inline-flex items-center gap-2 rounded-full bg-space-700 px-5 py-2.5 text-sm disabled:opacity-40">
              Next <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <div className="min-w-0">{s.visual}</div>
      </div>
    </section>
  )
}

function BigNumber({ value, label, sub, tone = "cyan" }: { value: string; label: string; sub: string; tone?: "cyan" | "hazard" | "warn" }) {
  const c = { cyan: "text-cyan", hazard: "text-hazard", warn: "text-warn" }[tone]
  return (
    <div className="rounded-3xl border border-line bg-space-900/60 p-8 text-center">
      <div className={`num text-6xl font-semibold ${c}`}>{value}</div>
      <div className="mt-3 text-sm text-ink">{label}</div>
      <div className="mt-1 text-xs text-ink-3">{sub}</div>
    </div>
  )
}
