"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUp, Sparkles, X } from "lucide-react"
import { openCopilot } from "@/components/Copilot"
import { Globe, SITES } from "./Globe"

export function HomeHero() {
  const [selected, setSelected] = useState("grc")
  const [cardOpen, setCardOpen] = useState(true)
  const [q, setQ] = useState("")
  const site = SITES.find((s) => s.id === selected) ?? SITES[0]

  return (
    <div className="panel relative overflow-hidden p-5 sm:p-8">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="relative z-10 min-w-0">
          <div className="label mb-3 text-cyan">NASA Space Apps 2026 · Flame in Freefall</div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-wide sm:text-5xl">
            <span className="whitespace-nowrap">Earth-safe</span> <span className="text-earth">isn&apos;t</span> <span className="whitespace-nowrap">space-safe.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2">
            NASA checks spacecraft materials with a fire test done here on Earth. But experiments on the space station show
            flames can survive on less oxygen in space, and future Moon habitats will breathe oxygen-richer air. We turned
            NASA&apos;s space fire experiments into an interactive dashboard that shows where the risk is, and says
            plainly where nobody has data yet.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/investigation" className="glow-ring rounded-full bg-space-700 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em]">
              Stress-test a habitat
            </Link>
            <Link href="/explorers" className="rounded-full border border-line px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-2 hover:text-ink">
              Take the 2-minute tour
            </Link>
          </div>

          <form
            className="mt-8 flex items-center gap-2 rounded-full border border-line bg-space-900/80 p-1.5 pl-2"
            onSubmit={(e) => {
              e.preventDefault()
              openCopilot(q)
              setQ("")
            }}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-space-700 text-cyan">
              <Sparkles size={16} />
            </span>
            <label htmlFor="home-ask" className="sr-only">Ask the copilot</label>
            <input
              id="home-ask"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask about ignition, flame spread, suppression…"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            />
            <button type="submit" aria-label="Ask" className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink-2 hover:text-cyan">
              <ArrowUp size={16} />
            </button>
          </form>
        </div>

        <div className="relative min-w-0">
          <Globe selected={selected} onSelect={(id) => { setSelected(id); setCardOpen(true) }} />
          {cardOpen && (
            <div className="panel absolute right-0 top-2 w-[min(260px,80%)] p-4 sm:-right-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="label">Research site</div>
                  <div className="mt-1 font-semibold leading-snug">{site.name}</div>
                </div>
                <button type="button" aria-label="Close" onClick={() => setCardOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-ink-2">
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3 text-xs text-ink-3">{site.place}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{site.role}</p>
              <p className="mt-3 text-[10px] text-ink-3">Source: {site.source}</p>
              <div className="mt-3 flex gap-1.5">
                {SITES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s.id)}
                    aria-pressed={s.id === selected}
                    className={`h-1.5 flex-1 rounded-full ${s.id === selected ? "bg-cyan" : "bg-space-700"}`}
                    aria-label={s.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
